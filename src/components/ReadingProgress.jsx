import { useEffect, useState } from 'react'
import { throttle } from '../lib/timing'

// A `scroll` listener can fire dozens of times per second during a fast swipe
// — there's no ResizeObserver-style batching for scroll position, so throttling
// the handler is still the standard tool. Unlike debounce (FeedPage), this
// needs updates to keep happening *throughout* the scroll, just capped to a
// sane rate — the progress bar should track the gesture, not just report where
// it ended up.
export function ReadingProgress({ targetRef }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const el = targetRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const scrolled = -rect.top
      const pct = scrollable > 0 ? Math.min(100, Math.max(0, (scrolled / scrollable) * 100)) : 0
      setProgress(pct)
    }

    const throttled = throttle(update, 100) // at most 10 updates/sec
    window.addEventListener('scroll', throttled, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', throttled)
      throttled.cancel()
    }
  }, [targetRef])

  return (
    <div className="reading-progress" aria-hidden="true">
      {/* transform, not width: this animates on the compositor, off the main
          thread — the animation lesson from topic 04, applied. */}
      <div
        className="reading-progress__bar"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  )
}
