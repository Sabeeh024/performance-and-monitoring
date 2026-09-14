import Image from 'next/image'
import Link from 'next/link'
import { Avatar } from './Avatar'

const SIZES = '(max-width: 900px) 100vw, 868px'

// `priority` (only the first card) is next/image's fetchpriority=high +
// loading=eager, same idea as topic 03's manual attributes on the SPA's
// PostCard - here it's one prop instead of three, and next/image sets
// `loading="lazy"` on every *other* image by default, so the "eager on the
// LCP image, lazy on the rest" split is the default, not something to remember.
export function PostCard({ post, priority = false }) {
  return (
    <article className="card">
      <Link href={`/post/${post.id}`} className="card__cover-wrap">
        <Image
          src={`https://picsum.photos/seed/${post.coverSeed}/1200/630`}
          alt=""
          fill
          sizes={SIZES}
          style={{ objectFit: 'cover' }}
          priority={priority}
        />
      </Link>
      <div className="card__body">
        <div className="card__meta">
          <Avatar user={post.author} size={24} />
          <span>{post.author.name}</span>
          <span>·</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </div>
        <h2 className="card__title">
          <Link href={`/post/${post.id}`}>{post.title}</Link>
        </h2>
        <p className="card__excerpt">{post.excerpt}</p>
        <div>
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
