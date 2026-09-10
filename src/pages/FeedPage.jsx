import { useEffect, useState } from 'react'
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

// Baseline: every keystroke re-runs this whole function — filter over ~800 posts,
// sort the result, then render every matching <PostCard>. No memoisation, no
// virtualization. This is the thing topic 04 profiles and then fixes.
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

export function FeedPage() {
  const [posts, setPosts] = useState(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let alive = true
    getPosts().then((data) => alive && setPosts(data))
    return () => {
      alive = false
    }
  }, [])

  if (!posts) return <Spinner label="Loading feed…" />

  const results = filterSort(posts, query, tag, sort)

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

      <div className="feed__grid">
        {results.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            query={query}
            priority={i === 0}
          />
        ))}
      </div>
    </div>
  )
}
