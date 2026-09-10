import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { getPost, getRelated, peekPost } from '../api/posts'
import { Avatar } from '../components/Avatar'
import { Spinner } from '../components/Spinner'
import { formatDate } from '../lib/formatDate'
import { cover } from '../lib/img'

// Comments sit below the fold and pull in CommentForm + the comments API.
// Split them out so they don't block the article itself from rendering.
const CommentsSection = lazy(() =>
  import('../features/comments/CommentsSection').then((m) => ({
    default: m.CommentsSection,
  })),
)

const COVER_SIZES = '(max-width: 900px) 100vw, 868px'

function Cover({ seed }) {
  if (!seed) return <div className="post__cover post__cover--ph" />
  const img = cover(seed, { sizes: COVER_SIZES })
  return (
    <img
      className="post__cover"
      src={img.src}
      srcSet={img.srcSet}
      sizes={img.sizes}
      width={img.width}
      height={img.height}
      alt=""
      // This is the LCP element. Load it eagerly, ahead of everything else,
      // and hint the browser to decode without blocking the main thread.
      loading="eager"
      fetchPriority="high"
      decoding="async"
    />
  )
}

export function PostPage() {
  const { id } = useParams()
  // Seed the state from cache (set by the feed) so the cover <img> is in the
  // very first render instead of appearing only after the 400 ms fetch.
  const [post, setPost] = useState(() => peekPost(id))
  const [related, setRelated] = useState([])
  const [likes, setLikes] = useState(0)

  useEffect(() => {
    let alive = true
    setPost(peekPost(id))
    getPost(id).then((data) => {
      if (!alive) return
      setPost(data)
      setLikes(data?.likes ?? 0)
    })
    getRelated(id).then((data) => alive && setRelated(data))
    return () => {
      alive = false
    }
  }, [id])

  const coverSeed = post?.coverSeed ?? peekPost(id)?.coverSeed

  return (
    <article className="post">
      <Cover seed={coverSeed} />

      {!post ? (
        <Spinner label="Loading post…" />
      ) : (
        <>
          <h1 className="post__title">{post.title}</h1>
          <div className="post__meta">
            <Avatar user={post.author} size={32} />
            <span>{post.author.name}</span>
            <span>·</span>
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
          </div>
          <button className="like" onClick={() => setLikes((n) => n + 1)}>
            ♥ {likes}
          </button>
          <div
            className="post__body"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(marked.parse(post.body)),
            }}
          />

          {related.length > 0 && (
            <aside className="related">
              <h3>Related</h3>
              <ul>
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/post/${r.id}`}>{r.title}</Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <Suspense fallback={<Spinner label="Loading comments…" />}>
            <CommentsSection postId={post.id} />
          </Suspense>
        </>
      )}
    </article>
  )
}
