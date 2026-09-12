import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import { BarChart } from '../components/BarChart'
import { getAllPostsWithBodies, getPosts } from '../api/posts'
import { Spinner } from '../components/Spinner'
import { buildCsvChunked, buildCsvSync } from '../lib/csv'
import {
  computeTagStats,
  computeTrending,
  fuzzyTitleSearch,
} from '../lib/insights'

// A visible "is the main thread free right now" indicator: ticks every 100ms
// via setInterval. A blocking synchronous task delays this exactly like it
// would delay a click or a keystroke — the tick visibly stalls, then jumps.
function useHeartbeat() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100)
    return () => clearInterval(id)
  }, [])
  return tick
}

export function InsightsPage() {
  const [posts, setPosts] = useState(null)
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let alive = true
    getPosts().then((data) => alive && setPosts(data))
    return () => {
      alive = false
    }
  }, [])

  // The tab switch itself is trivial; what's expensive is whatever the new tab
  // renders. Opening "Trending" triggers computeTrending() below — an all-pairs
  // scan, ~20 ms/800 posts. Wrapping the state update in startTransition means
  // React treats that render as low-priority and interruptible: you can still
  // type in the search box or click another tab while it resolves, and
  // `isPending` tells us it's in flight.
  function selectTab(next) {
    startTransition(() => setTab(next))
  }

  const tagStats = useMemo(() => (posts ? computeTagStats(posts).slice(0, 8) : []), [posts])

  const trending = useMemo(() => {
    if (tab !== 'trending' || !posts) return null
    return computeTrending(posts)
  }, [tab, posts])

  // The search box is the useDeferredValue half of the pair: `query` is state
  // *we* own and that changes on every keystroke, so we give the expensive
  // part (fuzzyTitleSearch) a lagging copy instead of marking each keystroke's
  // update as a transition — the input must never itself feel delayed.
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery
  const searchResults = useMemo(
    () => (posts ? fuzzyTitleSearch(posts, deferredQuery) : []),
    [posts, deferredQuery],
  )

  // "Breaking up work": both buttons do the *same* ~50 ms task (render a
  // Markdown preview for all 800 posts into CSV rows). The only difference is
  // whether it runs as one synchronous block or in yielded chunks. Watch the
  // heartbeat number below while each one runs.
  const heartbeat = useHeartbeat()
  const [exportState, setExportState] = useState(null) // { mode, status, progress, ms, chars }

  // Export needs bodies, which the feed's getPosts() deliberately never has
  // (topic 02/03). Fetched separately, lazily, only once the Export tab is
  // actually opened — no reason to pull 800 Markdown bodies over the wire for
  // anyone just looking at the tag chart.
  const [exportPosts, setExportPosts] = useState(null)
  useEffect(() => {
    if (tab !== 'export' || exportPosts) return
    let alive = true
    getAllPostsWithBodies().then((data) => alive && setExportPosts(data))
    return () => {
      alive = false
    }
  }, [tab, exportPosts])

  async function runExport(mode) {
    setExportState({ mode, status: 'running', progress: 0 })
    const t0 = performance.now()
    const csv =
      mode === 'blocking'
        ? buildCsvSync(exportPosts)
        : await buildCsvChunked(exportPosts, {
            onProgress: (progress) => setExportState((s) => ({ ...s, progress })),
          })
    setExportState({
      mode,
      status: 'done',
      progress: 100,
      ms: Math.round(performance.now() - t0),
      chars: csv.length,
    })
  }

  if (!posts) return <Spinner label="Loading insights…" />

  return (
    <div className="insights">
      <h1>Insights</h1>

      <div className="insights__tabs">
        <button
          className={tab === 'overview' ? 'is-active' : ''}
          onClick={() => selectTab('overview')}
        >
          Overview
        </button>
        <button
          className={tab === 'trending' ? 'is-active' : ''}
          onClick={() => selectTab('trending')}
        >
          Trending{isPending && tab !== 'trending' ? '…' : ''}
        </button>
        <button
          className={tab === 'search' ? 'is-active' : ''}
          onClick={() => selectTab('search')}
        >
          Search
        </button>
        <button
          className={tab === 'export' ? 'is-active' : ''}
          onClick={() => selectTab('export')}
        >
          Export
        </button>
      </div>

      <p className="muted insights__heartbeat">
        main-thread heartbeat: {heartbeat}{' '}
        <span title="Ticks every 100ms via setInterval. Stalls exactly like a click or keystroke would during a blocking task.">
          (?)
        </span>
      </p>

      {tab === 'overview' && (
        <section>
          <h2>Posts per tag</h2>
          <BarChart data={tagStats} />
        </section>
      )}

      {tab === 'trending' && (
        <section style={{ opacity: isPending ? 0.6 : 1 }}>
          <h2>
            Trending{' '}
            {isPending && <span className="muted">· computing…</span>}
          </h2>
          <ol className="insights__trending">
            {trending?.map(({ post, score }) => (
              <li key={post.id}>
                <Link to={`/post/${post.id}`}>{post.title}</Link>{' '}
                <span className="muted">score {score}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {tab === 'search' && (
        <section>
          <h2>Typo-tolerant title search</h2>
          <input
            type="search"
            placeholder="Try misspelling a word…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="insights__results" style={{ opacity: isStale ? 0.6 : 1 }}>
            {searchResults.map((post) => (
              <li key={post.id}>
                <Link to={`/post/${post.id}`}>{post.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'export' && (
        <section>
          <h2>Export as CSV (with rendered body preview)</h2>
          <p className="muted">
            Same ~50 ms task (Markdown-render 800 posts into rows) run two ways.
            Watch the heartbeat above while each one runs.
          </p>
          {!exportPosts ? (
            <Spinner label="Fetching full post bodies for export…" />
          ) : (
            <div className="insights__export-actions">
              <button onClick={() => runExport('blocking')}>Export (blocking)</button>
              <button onClick={() => runExport('chunked')}>Export (chunked)</button>
            </div>
          )}
          {exportState && (
            <p className="muted">
              {exportState.status === 'running'
                ? `exporting… ${exportState.mode === 'chunked' ? exportState.progress + '%' : ''}`
                : `${exportState.mode}: ${exportState.chars.toLocaleString()} chars in ${exportState.ms} ms`}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
