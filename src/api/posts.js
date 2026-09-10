import { fakeGet } from './client'
import { POSTS } from '../data/seed'

// Tiny in-memory cache. The feed populates it; the post page can then read the
// cover URL synchronously and render the LCP <img> on the first frame instead of
// after a 400 ms fetch. (A real app uses React Query / a router loader — topic 06.)
const cache = new Map()

export function getPosts() {
  return fakeGet(() => POSTS.map(({ body, ...rest }) => rest)).then((list) => {
    for (const p of list) cache.set(p.id, { ...cache.get(p.id), ...p })
    return list
  })
}

export function getPost(id) {
  return fakeGet(() => POSTS.find((p) => p.id === id) ?? null).then((post) => {
    if (post) cache.set(id, { ...cache.get(id), ...post })
    return post
  })
}

// Synchronous read — whatever we already know about this post, or null.
export const peekPost = (id) => cache.get(id) ?? null

// Deliberately O(n*m) tag-overlap scoring, run on every PostPage render.
// Cheap at 15 posts; it's here as a hook for the runtime-performance topic.
export function getRelated(id) {
  return fakeGet(() => {
    const target = POSTS.find((p) => p.id === id)
    if (!target) return []
    return POSTS.filter((p) => p.id !== id)
      .map((p) => ({
        post: p,
        score: p.tags.filter((t) => target.tags.includes(t)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.post)
  })
}
