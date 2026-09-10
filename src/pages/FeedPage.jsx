import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { getPosts } from '../api/posts'
import { PostCard } from '../components/PostCard'
import { Spinner } from '../components/Spinner'
import { ALL_TAGS } from '../data/seed'

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
  const [posts, setPosts] = useState(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [sort, setSort] = useState('newest')
  const listRef = useRef(null)
  const [listTop, setListTop] = useState(0)

  useLayoutEffect(() => {
    if (listRef.current) setListTop(listRef.current.offsetTop)
  }, [posts])

  useEffect(() => {
    let alive = true
    getPosts().then((data) => alive && setPosts(data))
    return () => {
      alive = false
    }
  }, [])

  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  const results = useMemo(
    () => filterSort(posts ?? [], deferredQuery, tag, sort),
    [posts, deferredQuery, tag, sort],
  )

  // Render only the rows near the viewport. 800 <article>s -> ~8-12 in the DOM.
  const virtualizer = useWindowVirtualizer({
    count: results.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
    gap: 28,
    scrollMargin: listTop,
  })

  if (!posts) return <Spinner label="Loading feed…" />

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
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="all">All tags</option>
          {ALL_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="likes">Most liked</option>
          <option value="quickest">Quickest read</option>
        </select>
      </div>

      <p className="feed__count muted">{results.length} posts</p>

      <div
        ref={listRef}
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          opacity: isStale ? 0.6 : 1,
          transition: 'opacity 120ms',
        }}
      >
        {items.map((item) => {
          const post = results[item.index]
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
    </div>
  )
}
