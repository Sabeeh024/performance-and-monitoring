import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPost, getRelated } from '../api/posts'
import { Avatar } from '../components/Avatar'
import { Spinner } from '../components/Spinner'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { formatDate } from '../lib/formatDate'

// Comments sit below the fold and pull in CommentForm + the comments API.
// Split them out so they don't block the article itself from rendering.
const CommentsSection = lazy(() =>
  import('../features/comments/CommentsSection').then((m) => ({
    default: m.CommentsSection,
  })),
)

export function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [likes, setLikes] = useState(0)

  useEffect(() => {
    let alive = true
    setPost(null)
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

  if (!post) return <Spinner label="Loading post…" />

  return (
    <article className="post">
      <img className="post__cover" src={post.cover} alt="" />
      <h1 className="post__title">{post.title}</h1>
      <div className="post__meta">
        <Avatar user={post.author} size={32} />
        <span>{post.author.name}</span>
        <span>·</span>
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
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
    </article>
  )
}
