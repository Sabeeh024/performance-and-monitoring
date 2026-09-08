import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { formatDate } from '../lib/formatDate'

// Cover <img> has no width/height and no lazy loading yet — both intentional,
// they become the worked examples in the loading and layout topics.
export function PostCard({ post }) {
  return (
    <article className="card">
      <Link to={`/post/${post.id}`}>
        <img className="card__cover" src={post.cover} alt="" />
      </Link>
      <div className="card__body">
        <div className="card__meta">
          <Avatar user={post.author} size={24} />
          <span>{post.author.name}</span>
          <span>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </div>
        <h2 className="card__title">
          <Link to={`/post/${post.id}`}>{post.title}</Link>
        </h2>
        <p className="card__excerpt">{post.excerpt}</p>
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
}
