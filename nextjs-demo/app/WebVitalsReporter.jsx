'use client'

import { useReportWebVitals } from 'next/web-vitals'

// Compare to the Vite app's src/lib/vitals.js: there, wiring web-vitals meant
// picking the attribution build, writing a summarizer per metric, and a
// sendBeacon/fetch fallback by hand (~90 lines). Here, Next's own hook
// already wraps web-vitals internally - this is the entire client-side
// surface needed to get every metric with the same name/value/rating/id
// shape. It does NOT include attribution or a transport by default - you
// still wire sendBeacon (or whatever endpoint) yourself, same as before;
// what's new is not needing to hand-pick and call the five onX functions.
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', JSON.stringify(metric))
    }
  })
  return null
}
