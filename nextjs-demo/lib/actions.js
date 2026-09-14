'use server'

import { revalidatePath } from 'next/cache'
import { addComment, likePost } from './data'

// Server Actions: a mutation defined on the server, called directly from a
// Client Component like a normal async function - no API route, no fetch call
// to write by hand. Compare to the Vite app's api/posts.js + hooks/postQueries.js
// (topic 06): there, a mutation meant a fetch function, a React Query
// useMutation wrapper, and a client-side cache update. Here it's this
// function, plus revalidatePath to tell the ISR cache its data is stale.
export async function likePostAction(id) {
  const likes = await likePost(id)
  revalidatePath(`/post/${id}`)
  return likes
}

export async function addCommentAction(postId, author, text) {
  const comment = await addComment(postId, { author, text })
  revalidatePath(`/post/${postId}`)
  return comment
}
