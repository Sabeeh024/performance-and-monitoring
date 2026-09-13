import { useEffect } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getPost, getPosts, getPostsPage, likePost } from '../api/posts'

// Default browsing: paginated, one page fetched at a time. `getNextPageParam`
// reads the cursor the (simulated) API handed back — the standard
// useInfiniteQuery shape.
export function usePostsInfinite(enabled) {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: ({ pageParam }) => getPostsPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled,
  })
}

// Search/filter/sort mode: needs the whole corpus client-side (there's no
// search endpoint here), fetched once and cached — flipping a filter on and
// off doesn't refetch.
export function useAllPosts(enabled) {
  return useQuery({
    queryKey: ['posts', 'all'],
    queryFn: getPosts,
    enabled,
  })
}

// Prime the individual-post cache from whatever list data we already have, so
// a post opened from either list mode shows its title/author/cover instantly
// (React Query serves the cached entry as `data` immediately) while the full
// `getPost(id)` below fills in `body` in the background. This replaces the
// hand-rolled peekPost() cache from topic 03 with the same idea, built on the
// library's own cache instead of a second one.
//
// `updatedAt: 0` marks a primed entry as already-stale — so opening it still
// triggers a real fetch to get `body`. Skipping any post that already has a
// full record (from a previous visit) is what keeps a revisit instant: it
// leaves that entry's real freshness clock alone instead of resetting it
// every time the feed re-renders.
export function usePrimePostCache(posts) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!posts) return
    for (const post of posts) {
      const existing = queryClient.getQueryData(['post', post.id])
      if (existing?.body) continue
      queryClient.setQueryData(['post', post.id], (old) => ({ ...old, ...post }), {
        updatedAt: 0,
      })
    }
  }, [posts, queryClient])
}

export function usePost(id) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
    // Uses the client's default staleTime (main.jsx) - a primed-only entry is
    // already marked stale (above) so it still refetches; a fully-loaded one
    // from an earlier visit stays fresh and doesn't.
  })
}

// Optimistic like: the UI updates the count before the (simulated) request
// resolves, and rolls back if it fails. `onMutate` runs synchronously, before
// the network call — that's the whole trick.
export function useLikeMutation(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => likePost(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['post', id] })
      const previous = queryClient.getQueryData(['post', id])
      queryClient.setQueryData(['post', id], (old) =>
        old ? { ...old, likes: old.likes + 1 } : old,
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['post', id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    },
  })
}
