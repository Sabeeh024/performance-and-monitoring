import { fakeGet } from './client'
import { POSTS } from '../data/seed'

const PAGE_SIZE = 40

// A real paginated list endpoint — the default way the feed loads now instead
// of "fetch all 800 up front." Shape matches what most REST APIs return:
// items for this page + whatever the client needs to ask for the next one.
export function getPostsPage(pageParam = 0) {
  return fakeGet(() => {
    const start = pageParam * PAGE_SIZE
    const slice = POSTS.slice(start, start + PAGE_SIZE).map(({ body, ...rest }) => rest)
    return { posts: slice, nextPage: start + PAGE_SIZE < POSTS.length ? pageParam + 1 : null }
  })
}

// The full stripped list in one call — what the feed switches to once a
// search/filter/sort is active (client-side filtering over everything needs
// everything; paginating *and* filtering the same way would mean re-fetching
// on every keystroke, or a real search endpoint neither exists here).
export function getPosts() {
  return fakeGet(() => POSTS.map(({ body, ...rest }) => rest))
}

export function getPost(id) {
  return fakeGet(() => POSTS.find((p) => p.id === id) ?? null)
}

// A distinct "full export" fetch, with bodies — deliberately separate from
// getPosts(). A real API wouldn't hand a list view all 800 Markdown bodies
// (topic 02's whole point); a bulk-export feature is a different request with
// a different shape, fetched only when something actually needs it.
export function getAllPostsWithBodies() {
  return fakeGet(() => POSTS)
}

export function likePost(id) {
  return fakeGet(() => {
    const post = POSTS.find((p) => p.id === id)
    if (post) post.likes += 1
    return post?.likes
  })
}

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
