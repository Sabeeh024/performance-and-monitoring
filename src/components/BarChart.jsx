import { useEffect, useRef, useState } from 'react'

// A responsive SVG bar chart, no charting library. The point of this component
// is the sizing mechanism, not the chart: it needs its actual rendered pixel
// width to lay out bars, and that width can change for reasons that have
// nothing to do with the window (a sidebar toggling, a flex sibling growing,
// this very panel changing tabs) — a `window.resize` listener misses all of
// those. ResizeObserver watches the *element* itself, whatever the cause.
export function BarChart({ data, height = 220 }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let rafId = null
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      // Do NOT call setState directly in here. A ResizeObserver callback runs
      // synchronously inside layout; setting state that itself changes layout
      // can trigger another resize notification in the same cycle, and the
      // browser logs "ResizeObserver loop completed with undelivered
      // notifications" (or on some browsers, throws). Deferring the actual
      // state update to the next animation frame breaks that cycle — the same
      // "batch reads, then write on the next frame" rule as any layout code.
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setWidth(entry.contentRect.width)
      })
    })
    observer.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [])

  const max = Math.max(1, ...data.map((d) => d.value))
  const gap = 8
  const barWidth = data.length ? (width - gap * (data.length - 1)) / data.length : 0

  return (
    <div ref={containerRef} className="chart">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Bar chart">
          {data.map((d, i) => {
            const barHeight = (d.value / max) * (height - 24)
            const x = i * (barWidth + gap)
            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={height - barHeight - 20}
                  width={Math.max(1, barWidth)}
                  height={barHeight}
                  fill="var(--accent)"
                  rx={3}
                />
                <text
                  x={x + barWidth / 2}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--muted)"
                >
                  {d.label.slice(0, 9)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
