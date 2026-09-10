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

// "Related posts" scoring runs over the whole corpus. It's offloaded to a Web
// Worker so it never blocks the main thread while the post is being read —
// scoring + a route transition + Markdown render on one thread is what caused
// the jank. One long-lived worker, reused across navigations.
let worker
function getWorker() {
  worker ??= new Worker(new URL('../lib/related.worker.js', import.meta.url), {
    type: 'module',
  })
  return worker
}

let nextReqId = 0
export function getRelated(id) {
  return new Promise((resolve) => {
    const w = getWorker()
    const reqId = ++nextReqId
    const onMessage = (e) => {
      if (e.data.reqId !== reqId) return
      w.removeEventListener('message', onMessage)
      const byId = new Map(POSTS.map((p) => [p.id, p]))
      resolve(e.data.ids.map((rid) => byId.get(rid)).filter(Boolean))
    }
    w.addEventListener('message', onMessage)
    w.postMessage({ id, reqId })
  })
}
