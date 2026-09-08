import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function CommentForm({ onSubmit }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user)
    return (
      <p className="muted">
        <Link to="/login">Log in</Link> to comment.
      </p>
    )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    await onSubmit({ author: user, text: text.trim() })
    setText('')
    setBusy(false)
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
        rows={3}
      />
      <button type="submit" disabled={busy}>
        {busy ? 'Posting…' : 'Post comment'}
      </button>
    </form>
  )
}
