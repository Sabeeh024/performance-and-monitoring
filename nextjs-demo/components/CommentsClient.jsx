'use client'

import { useOptimistic, useRef, useTransition } from 'react'
import { Avatar } from './Avatar'
import { addCommentAction } from '@/lib/actions'

// Same useOptimistic idea as LikeButton, for a list instead of a counter: the
// submitted comment appears immediately, before the Server Action (and its
// 300ms simulated latency) resolves. This sidesteps a real thing found while
// building this - router.refresh() re-requests the route's Server Component
// output correctly (confirmed: the network request fires), but didn't
// visibly update this already-mounted page's DOM within several seconds in
// this environment, even though a full reload always showed the write had
// persisted. Optimistic client state doesn't depend on that timing at all,
// which is the more robust pattern regardless of the cause.
export function CommentsClient({ postId, initialComments }) {
  const [isPending, startTransition] = useTransition()
  const formRef = useRef(null)
  const [comments, addOptimisticComment] = useOptimistic(
    initialComments,
    (current, newComment) => [...current, newComment],
  )

  function handleSubmit(e) {
    e.preventDefault()
    const text = new FormData(e.currentTarget).get('text')?.trim()
    if (!text) return
    formRef.current?.reset()
    startTransition(async () => {
      addOptimisticComment({
        id: `pending-${Date.now()}`,
        author: { name: 'You', avatar: 'https://i.pravatar.cc/80?img=5' },
        text,
      })
      await addCommentAction(postId, { id: 'me', name: 'You' }, text)
    })
  }

  return (
    <>
      <h3>{comments.length} comments</h3>
      <form ref={formRef} className="comment-form" onSubmit={handleSubmit}>
        <textarea name="text" placeholder="Add a comment…" rows={3} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Posting…' : 'Post comment'}
        </button>
      </form>
      {comments.length === 0 ? (
        <p className="muted">No comments yet.</p>
      ) : (
        <ul className="comments">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <Avatar user={c.author} size={28} />
              <div>
                <div className="comment__meta">
                  <strong>{c.author.name}</strong>
                </div>
                <p>{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
