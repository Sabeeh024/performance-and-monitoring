import { Avatar } from '../../components/Avatar'
import { formatRelative } from '../../lib/formatDate'

export function CommentList({ comments }) {
  if (!comments.length) return <p className="muted">No comments yet.</p>
  return (
    <ul className="comments">
      {comments.map((c) => (
        <li key={c.id} className="comment">
          <Avatar user={c.author} size={28} />
          <div>
            <div className="comment__meta">
              <strong>{c.author.name}</strong>
              <span className="muted">{formatRelative(c.createdAt)}</span>
            </div>
            <p>{c.text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
