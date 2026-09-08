import { fakeGet } from './client'
import { POSTS } from '../data/seed'

export function getPosts() {
  return fakeGet(() => POSTS.map(({ body, ...rest }) => rest))
}

export function getPost(id) {
  return fakeGet(() => POSTS.find((p) => p.id === id) ?? null)
}

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
