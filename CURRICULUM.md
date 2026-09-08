# Frontend Web Performance & Monitoring — Study Plan

A hands-on tour built on this barebones React + Vite app. Each module = short concept briefing + a change we make in this repo + how we measure it.

## 0. Setup & baseline (done)
- React 19 + Vite 8 scaffold.
- Next: take a baseline Lighthouse + bundle report so every later change has a "before".

## 1. The metrics vocabulary
- **Core Web Vitals**: LCP (loading), INP (interactivity, replaced FID in 2024), CLS (visual stability).
- Supporting: TTFB, FCP, TBT (lab proxy for INP), Speed Index.
- Lab vs field (RUM) data. Percentiles (p75) not averages.
- Tools: Lighthouse, PageSpeed Insights, Chrome DevTools Performance panel, `web-vitals` library, CrUX.

## 2. Loading performance
- Bundle analysis (`rollup-plugin-visualizer`), tree-shaking, code-splitting via `React.lazy` + `Suspense`, route-based splitting.
- Asset optimization: image formats (AVIF/WebP), responsive images, `loading="lazy"`, fonts (`font-display`, preload, subsetting).
- Critical path: preconnect/preload/prefetch, defer/async scripts.
- Compression (gzip/brotli), caching headers, CDN, HTTP/2-3.
- Advanced (brief): SSR/SSG/streaming, islands, RSC, module preload graphs.

## 3. Runtime & rendering performance
- React render cost: `React.memo`, `useMemo`/`useCallback` (and when NOT to), key stability, context split, `useTransition`/`useDeferredValue`.
- Long tasks, main-thread blocking, `scheduler`/`isInputPending`, web workers.
- List virtualization (`@tanstack/react-virtual`).
- Reflow/repaint, layout thrashing, `content-visibility`, CSS containment, GPU compositing, `will-change`.
- Advanced (brief): concurrent rendering internals, `startTransition` scheduling, memory leaks / detached DOM.

## 4. Layout stability & interactivity
- CLS causes: images without dimensions, injected content, web fonts (FOUT/FOIT), animations.
- INP: event handler cost, hydration delay, debounce/throttle, breaking up work.

## 5. Network layer
- Waterfall reading, request prioritization, `fetch` priority hints.
- Data fetching patterns: over-fetching, N+1, caching (React Query / SWR), prefetching, optimistic UI.
- Pagination vs infinite scroll vs virtualization.

## 6. Build & delivery
- Vite/Rollup config, chunk strategy, `manualChunks`, dependency pre-bundling.
- Source maps, modern/legacy builds, polyfill cost.
- Bundle budgets in CI (`size-limit`, Lighthouse CI).

## 7. Monitoring & analytics (production)
- **RUM**: `web-vitals` → analytics endpoint; what to log (metric, attribution, device, connection).
- Tools: Google Analytics 4, Vercel Speed Insights, Sentry Performance, SpeedCurve, Datadog RUM, Grafana Faro, Cloudflare Web Analytics.
- Synthetic monitoring: Lighthouse CI, WebPageTest, Checkly.
- Dashboards & alerting: p75 regressions, error budgets, release markers.
- Performance budgets & culture: tracking over time, ownership.

## 8. Checklist
- A distilled "every dev should know" checklist produced at the end.
