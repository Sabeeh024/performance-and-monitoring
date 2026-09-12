import { fakeGet } from './client'

// Stands in for a real analytics endpoint. The point isn't this function —
// it's how rarely it should be called relative to keystrokes (see the
// debounce wiring in FeedPage).
const log = []

export function logSearchQuery(query) {
  return fakeGet(() => {
    log.push({ query, at: Date.now() })
    return { count: log.length }
  })
}
