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
    </div>
  )
}
