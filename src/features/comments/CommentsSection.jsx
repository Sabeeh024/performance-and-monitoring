import { useCallback, useEffect, useState } from 'react'
import { addComment, getComments } from '../../api/comments'
import { Spinner } from '../../components/Spinner'
import { CommentForm } from './CommentForm'
import { CommentList } from './CommentList'

export function CommentsSection({ postId }) {
  const [comments, setComments] = useState(null)

  useEffect(() => {
    let alive = true
    getComments(postId).then((data) => alive && setComments(data))
    return () => {
      alive = false
    }
  }, [postId])

  const handleAdd = useCallback(
    async (payload) => {
      const created = await addComment(postId, payload)
      setComments((prev) => [...(prev ?? []), created])
    },
    [postId],
  )

  return (
    <section className="comments-section">
      <h3>{comments ? `${comments.length} comments` : 'Comments'}</h3>
      <CommentForm onSubmit={handleAdd} />
      {comments ? <CommentList comments={comments} /> : <Spinner label="Loading comments…" />}
    </section>
  )
}
