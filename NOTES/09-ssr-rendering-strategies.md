# 09 — SSR & rendering strategies (Next.js companion)

Everything so far was one rendering strategy: client-side rendering, an
empty `<div id="root">` until JS runs. This topic covers what changes with
the others — SSG, ISR, streaming SSR, Server Components — using a second
app in its own subfolder rather than a variant of the Vite app's own code,
since it's a different framework and build tool with its own
`package.json`/`node_modules`.

| | branch |
|---|---|
| Same Devlog concept (Feed + Post + comments), rebuilt on Next.js App Router, in `nextjs-demo/` | `topic/09-ssr-nextjs` (off `topic/08`) |

```
git switch topic/09-ssr-nextjs
cd nextjs-demo
npm install && npm run build && npm run start
```

---

## The three rendering strategies, on three routes

| Route | Strategy | How | Confirmed via |
|---|---|---|---|
| `/` | **SSG** | no `revalidate`, no dynamic APIs used → eligible for static generation | `next build` output: `○ (Static)` |
| `/post/[id]` | **ISR** | `export const revalidate = 60` + `generateStaticParams()` | `next build` output: `● (SSG)` per post id |
| `/post/[id]` comments | **Streaming SSR** | an async Server Component wrapped in `<Suspense>` | article ships immediately; comments arrive as a second HTML chunk |

SSG and ISR are the same mechanism (pre-rendered HTML, served instantly) —
ISR just adds an expiry: after 60s, the *next* visitor triggers a background
re-render that replaces the cache for everyone after, nobody waits on it
live. A pure-SSR route (render fresh on every request, no cache) would just
be `export const dynamic = 'force-dynamic'` — not built here since it's the
same mechanism as ISR minus the caching, not a new concept.

**Measured, desktop Lighthouse:** both routes score 100, **LCP 0.5-0.6s**
(vs. the Vite SPA's ~1.3-1.8s desktop for the equivalent pages), TBT 0ms.
The gap is the whole point of pre-rendering: there's no client-side fetch
gating the content — it's already in the HTML the server sent.

## React Server Components: the precise version of "ships less JS"

The post body's Markdown render (`marked` + `isomorphic-dompurify`) runs in
a Server Component — no `'use client'`. Confirmed by fetching every shipped
JS file and grepping for `marked`/`DOMPurify`/`sanitize`: **zero matches**.
The Vite SPA shipped both as a ~24 KB gzip client chunk (topic 02) so the
*browser* could do this work; here the browser never receives the library
at all, for any visitor.

**The honest counterpoint, measured rather than assumed:** total compressed
client JS for the Next post page is **~140 KB** — *more* than the Vite SPA's
~117 KB for the same page, despite that elimination. React 19 + Next's
client runtime + the RSC-streaming/hydration protocol has its own baseline
cost, and on this comparison (Next 16, Turbopack) it outweighs what RSC
saved. The correct claim is narrower than "RSC makes the bundle smaller": a
*specific* server-only dependency genuinely never ships — the aggregate
number depends on the framework's own runtime cost too, and that's worth
checking, not assuming.

Interactive pieces (`LikeButton`, the comment form) are `'use client'`
islands using `useOptimistic` + Server Actions — same optimistic-UI outcome
as the Vite app's React Query mutation (topic 06), built on React itself.
Verified: the like count and a submitted comment both appear within ~30ms,
well before the (simulated) 300ms server round-trip resolves.

**A real gotcha found building this:** a Server Action's `revalidatePath`
correctly invalidates the server cache (confirmed: a full reload always
showed the write), but `router.refresh()` — the standard way to update the
*already-mounted* page after that — fired the expected network request and
still didn't visibly update the DOM within several seconds in this
environment. Switched the comment list to `useOptimistic` instead, which
doesn't depend on that timing at all and is the more robust pattern anyway.

## Tooling that replaces hand-built topic 03/08 work

- **`next/image`** — `sizes` + intrinsic width/height is enough; Next
  generates the `srcset` and negotiates AVIF/WebP via the real `Accept`
  header (content negotiation, not the `.webp`-suffix trick topic 03 used
  because picsum has no content negotiation of its own). `priority` = the
  `fetchpriority`+`loading` pair from topic 03, one prop instead of three.
- **`next/font/google`** — self-hosts Inter at build time (no runtime
  request to Google) and generates a fallback `@font-face` with
  `size-adjust` tuned to Inter's metrics — automates the "hand-pick a
  metrically-compatible fallback stack" work from topic 03.
- **`useReportWebVitals`** — Next's own hook wrapping `web-vitals`. Replaces
  the ~90 lines of `onCLS`/`onLCP`/etc. + attribution summarizing from
  topic 08's `lib/vitals.js` with one hook call. It does *not* include
  attribution or a transport by default — still wire `sendBeacon` yourself,
  same as before; what's automated is the five function calls, not the
  whole pipeline.
- **A real `/api/vitals` route** — trivial here (a route handler, not a
  simulation) because Next is a server. The Vite SPA's beacon target was a
  real, documented 404 (topic 08) since a static SPA has no backend at all.

---

## Carries over unchanged (not rebuilt)

Core Web Vitals definitions/thresholds, debounce/throttle,
`useDeferredValue`/`useTransition`, `memo`, list virtualization, Web
Workers, chunked long tasks (`scheduler.yield`), image dimension/
`aspect-ratio` CLS prevention, React Query (still the right tool for
client-side interactive data a Server Component can't serve), bundle/
runtime CI budgets (same tools, would need recalibrated numbers for a
different chunk shape — not done here).

---

## Next questions this raises

**Q26 — The 140 KB vs 117 KB finding was measured against one small demo
app on one very new Next release (16, Turbopack).** Does the gap hold,
narrow, or reverse on a larger app where RSC eliminates *more* client
libraries, or on Next's previous (webpack) build pipeline? Not chased
further here — the methodology (measure the actual shipped bytes, don't
assume the framework's claim) is the transferable part.

**Q27 — Every number in this topic is local (`next start` on localhost),
same limitation as topic 01's lab-vs-field point.** ISR's real value — a
background regeneration that real visitors never wait on — needs a real
deployment with real traffic patterns to observe properly, not a single
local server.
