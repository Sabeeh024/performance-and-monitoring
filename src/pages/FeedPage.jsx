import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { logSearchQuery } from '../api/analytics'
import { PostCard } from '../components/PostCard'
import { Spinner } from '../components/Spinner'
import { ALL_TAGS } from '../data/seed'
import { usePostsInfinite, useAllPosts, usePrimePostCache } from '../hooks/postQueries'
import { debounce } from '../lib/timing'

const SORTS = {
  newest: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  oldest: (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
  likes: (a, b) => b.likes - a.likes,
  quickest: (a, b) => a.readingMinutes - b.readingMinutes,
}

function filterSort(posts, query, tag, sort) {
  const q = query.trim().toLowerCase()
  const out = posts.filter((p) => {
    if (tag !== 'all' && !p.tags.includes(tag)) return false
    if (!q) return true
    return (
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.author.name.toLowerCase().includes(q)
    )
  })
  out.sort(SORTS[sort])
  return out
}

const ROW_HEIGHT = 468 // estimate; the virtualizer measures the real height after mount

export function FeedPage() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [sort, setSort] = useState('newest')
  const listRef = useRef(null)
  const [listTop, setListTop] = useState(0)

  useLayoutEffect(() => {
    if (listRef.current) setListTop(listRef.current.offsetTop)
  }, [])

  // Any active filter needs the whole corpus client-side (no search endpoint
  // here) — plain browsing stays paginated. Only one of these two queries is
  // ever enabled at a time.
  const isFiltering = query.trim() !== '' || tag !== 'all' || sort !== 'newest'
  const infinite = usePostsInfinite(!isFiltering)
  const all = useAllPosts(isFiltering)

  const infinitePosts = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.posts) ?? [],
    [infinite.data],
  )
  usePrimePostCache(isFiltering ? all.data : infinitePosts)

  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  const [lastLogged, setLastLogged] = useState(null)
  const debouncedLog = useMemo(
    () =>
      debounce((q) => {
        logSearchQuery(q).then(() => setLastLogged(q))
      }, 500),
    [],
  )
  useEffect(() => {
    if (query.trim()) debouncedLog(query)
    return () => debouncedLog.cancel()
  }, [query, debouncedLog])

  const [isPending, startTransition] = useTransition()
  const onTagChange = (e) => {
    const value = e.target.value
    startTransition(() => setTag(value))
  }
  const onSortChange = (e) => {
    const value = e.target.value
    startTransition(() => setSort(value))
  }

  const filteredResults = useMemo(
    () => (all.data ? filterSort(all.data, deferredQuery, tag, sort) : []),
    [all.data, deferredQuery, tag, sort],
  )
  const results = isFiltering ? filteredResults : infinitePosts
  const isBusy = isStale || isPending
  const isInitialLoading = isFiltering ? all.isLoading : infinite.isLoading

  // Render only the rows near the viewport. 800 <article>s -> ~8-12 in the DOM.
  const virtualizer = useWindowVirtualizer({
    count: results.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
    gap: 28,
    scrollMargin: listTop,
  })

  // Infinite scroll: an IntersectionObserver on a sentinel element after the
  // list, not a scroll listener. `rootMargin` starts the next page loading
  // ~800px before the sentinel is actually on screen, so a page typically
  // finishes before the user scrolls far enough to notice a gap.
  const sentinelRef = useRef(null)
  useEffect(() => {
    if (isFiltering || !infinite.hasNextPage) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !infinite.isFetchingNextPage) {
          infinite.fetchNextPage()
        }
      },
      { rootMargin: '800px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isFiltering, infinite.hasNextPage, infinite.isFetchingNextPage, infinite.fetchNextPage])

  if (isInitialLoading) return <Spinner label="Loading feed…" />

  const items = virtualizer.getVirtualItems()

  return (
    <div className="feed">
      <h1 className="feed__heading">Latest posts</h1>

      <div className="feed__controls">
        <input
          type="search"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={tag} onChange={onTagChange}>
          <option value="all">All tags</option>
          {ALL_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={sort} onChange={onSortChange}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="likes">Most liked</option>
          <option value="quickest">Quickest read</option>
        </select>
      </div>

      <p className="feed__count muted">
        {isFiltering ? results.length : `${results.length}+`} posts
        {isPending && <span className="feed__pending"> · updating…</span>}
        {lastLogged && <span> · analytics logged “{lastLogged}” (debounced)</span>}
      </p>

      <div
        ref={listRef}
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          opacity: isBusy ? 0.6 : 1,
          transition: 'opacity 120ms',
        }}
      >
        {items.map((item) => {
          const post = results[item.index]
          if (!post) return null
          return (
            <div
              key={post.id}
              ref={virtualizer.measureElement}
              data-index={item.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${item.start - listTop}px)`,
              }}
            >
              <PostCard
                post={post}
                query={deferredQuery}
                priority={item.index === 0}
              />
            </div>
          )
        })}
      </div>

      {!isFiltering && infinite.hasNextPage && (
        <div ref={sentinelRef} className="feed__sentinel">
          {infinite.isFetchingNextPage && <Spinner label="Loading more…" />}
        </div>
      )}
    </div>
  )
}
