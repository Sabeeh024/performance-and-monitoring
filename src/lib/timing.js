// The classic, pre-concurrent-React tools for high-frequency event handlers.
// Different shape from useDeferredValue/useTransition (topic 04): those keep
// React's *rendering* responsive by scheduling; these reduce how often a
// *side effect* (a network call, a scroll calculation) runs at all. You often
// want both at once — defer the render, debounce the side effect it triggers.

// Debounce: wait for a pause. Call the wrapped function only after `ms` have
// passed with no further calls. Right for "the user stopped typing" — an
// analytics log, an autosave, a search API request. Wrong for anything that
// must respond continuously (a drag, a progress indicator) — it would only
// ever fire once, at the end.
export function debounce(fn, ms) {
  let timer = null
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}

// Throttle: guarantee at most one call per `ms`, on a regular cadence, for as
// long as the events keep coming. Right for scroll/pointermove/resize — you
// want periodic updates *throughout* the gesture, not just a single one after
// it ends. (Native `resize` on an element has a better answer — ResizeObserver,
// topic 04 — but `scroll` has no observer equivalent; throttling the listener
// is still the standard tool.)
export function throttle(fn, ms) {
  let last = 0
  let timer = null
  const throttled = (...args) => {
    const now = Date.now()
    const remaining = ms - (now - last)
    if (remaining <= 0) {
      clearTimeout(timer)
      last = now
      fn(...args)
    } else {
      clearTimeout(timer)
      timer = setTimeout(() => {
        last = Date.now()
        fn(...args)
      }, remaining)
    }
  }
  throttled.cancel = () => clearTimeout(timer)
  return throttled
}
