import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution'
import { reportWebVital } from '../api/analytics'

// The "attribution" build costs a little extra JS over the base package, but
// it's the difference between "LCP was 4.2s" (a number) and "LCP was 4.2s
// because of a 2.4s resourceLoadDelay on the cover image" (something you can
// act on) — every manual trace-digging session from topics 03/05/07 is what
// this gets for free, from real users, in production.
function summarizeAttribution(metric) {
  const a = metric.attribution
  if (!a) return null
  switch (metric.name) {
    case 'LCP':
      return {
        target: a.target,
        url: a.url,
        timeToFirstByte: Math.round(a.timeToFirstByte),
        resourceLoadDelay: Math.round(a.resourceLoadDelay),
        resourceLoadDuration: Math.round(a.resourceLoadDuration),
        elementRenderDelay: Math.round(a.elementRenderDelay),
      }
    case 'CLS':
      return { largestShiftTarget: a.largestShiftTarget, largestShiftValue: a.largestShiftValue }
    case 'INP':
      return {
        target: a.interactionTarget,
        type: a.interactionType,
        inputDelay: Math.round(a.inputDelay),
        processingDuration: Math.round(a.processingDuration),
        presentationDelay: Math.round(a.presentationDelay),
      }
    default:
      return null
  }
}

function send(metric) {
  const connection = navigator.connection
  reportWebVital({
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor' - CrUX's own thresholds
    route: location.pathname,
    attribution: summarizeAttribution(metric),
    connection: connection?.effectiveType ?? 'unknown',
    deviceMemory: navigator.deviceMemory ?? null,
    at: Date.now(),
  })
}

// Call once, at app startup (main.jsx). Each function attaches its own
// PerformanceObserver and calls `send` when that metric's final value is
// ready — CLS/INP specifically can report multiple times over a page's life
// (they're only "final" once the page is hidden/unloaded), so `send` may run
// more than once per metric per page view. That's expected, not a bug.
export function initWebVitals() {
  onCLS(send)
  onFCP(send)
  onINP(send)
  onLCP(send)
  onTTFB(send)
}
