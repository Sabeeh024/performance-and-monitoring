import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import { BarChart } from '../components/BarChart'
import { getPosts } from '../api/posts'
import { Spinner } from '../components/Spinner'
import {
  computeTagStats,
  computeTrending,
  fuzzyTitleSearch,
} from '../lib/insights'

// requestIdleCallback isn't in Safari. Fall back to a short setTimeout — worse
// scheduling (it's not actually tied to browser idleness) but the same shape,
// so the rest of the code doesn't need to know which one it got.
const requestIdle =
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb) => setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 1)
const cancelIdle = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout

export function InsightsPage() {
  const [posts, setPosts] = useState(null)
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Proactive, low-priority background work: nobody asked for "trending" yet,
  // but computing it is expensive (~20 ms/800 posts) and idle time is free.
  // This is the opposite shape from useTransition below — that one defers work
  // that WAS requested; this one does unrequested work only when the browser
  // has nothing better to do, and is fully cancellable if the page unmounts
  // before it runs.
  const [trendingCache, setTrendingCache] = useState(null)

  useEffect(() => {
    let alive = true
    getPosts().then((data) => alive && setPosts(data))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!posts || trendingCache) return
    const id = requestIdle(() => setTrendingCache(computeTrending(posts)), {
      timeout: 2000, // force it to run even if the browser is never idle this long
    })
    return () => cancelIdle(id)
  }, [posts, trendingCache])

  // The tab switch itself is trivial; what's expensive is whatever the new tab
  // renders. Wrapping the state update in startTransition means: if opening
  // "Trending" triggers the ~20 ms computeTrending() below (idle time hasn't
  // run yet), React treats that render as low-priority and interruptible —
  // you can still type in the search box or click another tab while it
  // resolves — and `isPending` tells us it's in flight. If trendingCache is
  // already warm, this render is nearly free either way.
  function selectTab(next) {
    startTransition(() => setTab(next))
  }

  const tagStats = useMemo(() => (posts ? computeTagStats(posts).slice(0, 8) : []), [posts])

  const trending = useMemo(() => {
    if (tab !== 'trending' || !posts) return null
    return trendingCache ?? computeTrending(posts)
  }, [tab, posts, trendingCache])

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
      </div>

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
            {isPending ? (
              <span className="muted">· computing…</span>
            ) : (
              <span className="muted">
                · {trendingCache ? 'pre-warmed during idle time' : 'computed on demand'}
              </span>
            )}
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
    </div>
  )
}
