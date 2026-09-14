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

// Real RUM beacons use `sendBeacon`, not `fetch`: it queues the payload in the
// browser and guarantees delivery even if the page is being unloaded right
// now (a normal fetch can be cancelled mid-flight when the tab closes) — the
// tradeoff is it's fire-and-forget, JS never learns whether the server
// actually received it. `fetch(..., { keepalive: true })` is the fallback
// where sendBeacon's size limit (~64 KB) or method (POST-only) don't fit.
//
// There's no real backend here, so the beacon call below targets a route that
// doesn't exist — harmless (sendBeacon has no failure callback to fire either
// way) — and the payload is *also* written to localStorage so this session's
// own Vitals view (InsightsPage) has something real to show.
const VITALS_KEY = 'devlog:vitals'

export function reportWebVital(payload) {
  const body = JSON.stringify(payload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body)
  } else {
    fetch('/api/vitals', { method: 'POST', body, keepalive: true }).catch(() => {})
  }

  try {
    const stored = JSON.parse(localStorage.getItem(VITALS_KEY) ?? '[]')
    stored.push(payload)
    localStorage.setItem(VITALS_KEY, JSON.stringify(stored.slice(-200)))
  } catch {
    // localStorage can throw (private browsing, quota) - RUM must never break the page over it
  }
}

export function getStoredVitals() {
  try {
    return JSON.parse(localStorage.getItem(VITALS_KEY) ?? '[]')
  } catch {
    return []
  }
}
