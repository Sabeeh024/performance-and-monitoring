'use client'

import { useOptimistic, useTransition } from 'react'
import { likePostAction } from '@/lib/actions'

// useOptimistic: React's own version of the optimistic-UI pattern from
// topic 06 (there, a React Query useMutation's onMutate/onError). Same idea -
// show the new value immediately, before the server confirms - built into
// React now rather than a data-fetching library's feature.
export function LikeButton({ postId, initialLikes }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    initialLikes,
    (current) => current + 1,
  )

  function like() {
    startTransition(async () => {
      addOptimisticLike()
      await likePostAction(postId)
    })
  }

  return (
    <button className="like" onClick={like} disabled={isPending}>
      ♥ {optimisticLikes}
    </button>
  )
}
