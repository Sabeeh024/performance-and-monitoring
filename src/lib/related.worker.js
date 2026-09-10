// Runs on its own thread. Vite bundles this + its imports via
// `new Worker(new URL('./related.worker.js', import.meta.url), { type: 'module' })`.
//
// The worker imports the post corpus directly rather than receiving it in each
// message — structured-cloning 800 objects per request would cost more than the
// scoring it saves. Messages carry only the target id.
import { POSTS } from '../data/seed'
import { scoreRelated } from './related'

const byId = new Map(POSTS.map((p) => [p.id, p]))

self.onmessage = (e) => {
  const { id, reqId } = e.data
  const target = byId.get(id)
  const ids = target ? scoreRelated(target, POSTS) : []
  self.postMessage({ reqId, ids })
}
