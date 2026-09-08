import { fakeGet } from './client'
import { COMMENTS } from '../data/seed'

export function getComments(postId) {
  return fakeGet(() => COMMENTS[postId] ?? [])
}

export function addComment(postId, { author, text }) {
  return fakeGet(() => {
    const comment = {
      id: `${postId}-c${Date.now()}`,
      author,
      createdAt: new Date().toISOString(),
      text,
    }
    COMMENTS[postId] = [...(COMMENTS[postId] ?? []), comment]
    return comment
  })
}
