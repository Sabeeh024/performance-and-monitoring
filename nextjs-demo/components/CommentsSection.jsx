import { getComments } from '@/lib/data'
import { CommentsClient } from './CommentsClient'

// An async Server Component: this function itself does the 300ms "fetch" -
// no useEffect, no loading state to hand-manage. Its caller wraps it in
// <Suspense>, which is what makes this streaming rather than blocking: the
// rest of the post ships immediately, this section's HTML arrives in a
// second chunk over the same connection once the fetch resolves. The list +
// form themselves are a Client Component (CommentsClient) because they need
// interactivity (useOptimistic) - the fetch does not.
export async function CommentsSection({ postId }) {
  const comments = await getComments(postId)
  return (
    <section className="comments-section">
      <CommentsClient postId={postId} initialComments={comments} />
    </section>
  )
}
