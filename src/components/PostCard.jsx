import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { formatDate } from '../lib/formatDate'
import { cover } from '../lib/img'

const COVER_SIZES = '(max-width: 900px) 100vw, 868px'

// Wrap query matches in <mark>. Runs for every card on every render in the
// baseline — cheap per call, but ~800 × per keystroke adds up.
function highlight(text, query) {
  const q = query.trim()
  if (!q) return text
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : part,
  )
}

// `priority` is set only for the first card. That image is the feed's LCP
// candidate, so it loads eagerly at high priority; every other cover is lazy and
// low priority so it doesn't compete for bandwidth on load.
// memo: with a stable `post` reference (the list is useMemo'd upstream) and
// primitive `query`/`priority`, a card only re-renders when its own props
// change — so scrolling the virtualized list doesn't re-render every row.
export const PostCard = memo(function PostCard({
  post,
  query = '',
  priority = false,
}) {
  const img = cover(post.coverSeed, { sizes: COVER_SIZES })
  return (
    <article className="card">
      <Link to={`/post/${post.id}`}>
        <img
          className="card__cover"
          src={img.src}
          srcSet={img.srcSet}
          sizes={img.sizes}
          width={img.width}
          height={img.height}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'low'}
          decoding="async"
        />
      </Link>
      <div className="card__body">
        <div className="card__meta">
          <Avatar user={post.author} size={24} />
          <span>{post.author.name}</span>
          <span>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h2 className="card__title">
          <Link to={`/post/${post.id}`}>{highlight(post.title, query)}</Link>
        </h2>
        <p className="card__excerpt">{highlight(post.excerpt, query)}</p>
        <div className="card__tags">
          {post.tags.map((t) => (
            <span key={t} className="tag">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
})
