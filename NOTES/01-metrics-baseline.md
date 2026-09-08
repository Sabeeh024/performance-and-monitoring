# 01 — Metrics vocabulary + the baseline

The app: **Devlog** — a feed of posts, a post page with related links + comments, a
mock login. React 19 + Vite 8, client-side routing, a fake API with ~500 ms
latency. Built once, then optimised down the branch chain.

| | branch |
|---|---|
| App built, perf smells left in | `topic/01-metrics-baseline` |

```
git switch topic/01-metrics-baseline
npm run dev            # or: npm run build && npm run preview
```

The build deliberately ships problems, each tagged in the code with a comment
pointing at the topic that fixes it. This doc is just about **naming what we
measure and reading the first numbers** — no fixes yet.

---

## The metric vocabulary

### Core Web Vitals (the three Google ranks on, measured at p75 of real users)

| Metric | What it measures | "Good" (p75) | Needs work | Poor |
|---|---|---|---|---|
| **LCP** — Largest Contentful Paint | Time until the biggest above-the-fold element (image / heading / text block) is painted. Proxy for "the page looks loaded." | ≤ 2.5 s | 2.5–4 s | > 4 s |
| **INP** — Interaction to Next Paint | Worst-case (near-worst) latency from a tap/click/keypress to the next frame, across the whole visit. Replaced FID in March 2024 — FID only measured the *first* input's queue delay; INP measures full handler + render cost, every interaction. | ≤ 200 ms | 200–500 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | Sum of unexpected layout-shift scores (impact fraction × distance fraction) over the session's worst 5 s window. Unitless. | ≤ 0.1 | 0.1–0.25 | > 0.25 |

### Supporting / diagnostic metrics

| Metric | What it is | Why you look at it |
|---|---|---|
| **TTFB** — Time To First Byte | Request start → first response byte. DNS + connect + TLS + server think time + redirects. | Floor for everything else. High TTFB = server/CDN/redirect problem, not a frontend one. |
| **FCP** — First Contentful Paint | First text or image painted. | Gap between FCP and LCP = how much the *main* content lags the *first* pixel. |
| **TBT** — Total Blocking Time | Sum of the blocking portion (time over 50 ms) of every long task between FCP and TTI, in the lab. | Lab stand-in for INP. Lighthouse can't interact, so it measures main-thread busyness instead. TBT 0 in the lab ≠ INP is fine in the field. |
| **TTI** — Time To Interactive | Main thread quiet enough to respond reliably. | Older metric, still in Lighthouse diagnostics. Largely superseded by TBT + INP. |
| **Speed Index** | How quickly the visible area fills in (filmstrip-based average). | Catches "slowly painting" pages that FCP/LCP alone miss. |
| **FID** — First Input Delay | *Deprecated.* Queue delay of the first interaction only. Gone from CWV as of 2024 — mentioned so you recognise it in old docs. |

### Lab vs field — the distinction that trips people up

- **Lab (synthetic):** one run, one machine, emulated network + CPU throttling, no
  real user. Reproducible, debuggable, runs in CI. Tools: Lighthouse, WebPageTest,
  DevTools Performance panel. Gives LCP, FCP, TBT, CLS, Speed Index. **Cannot give
  a real INP** (no interactions) — reports TBT instead.
- **Field (RUM — Real User Monitoring):** metrics collected from actual visitors'
  browsers via the `web-vitals` JS library or the browser's own reporting, then
  aggregated. This is what Google ranks on and what "the site is slow" actually
  means. Tools: Google's CrUX dataset, or your own RUM pipeline (topic 08).
- Report field data at **p75**, not average — one 12 s outlier drags a mean far
  more than it hurts the typical user, and you want "the experience 75% of visits
  are at least this good." Averages hide the tail; percentiles are the tail.
- Lab and field disagree all the time: lab runs cold cache on a fixed device;
  the field is warm caches, ad scripts, cheap Androids, and flaky transit. Lab
  tells you *why*; field tells you *whether it matters*.

### The measurement tools, and when each is the right one

| Tool | Kind | Use it for |
|---|---|---|
| **Lighthouse** (DevTools "Lighthouse" tab, `npx lighthouse`, CI) | Lab | Scored snapshot + prioritised opportunity list. The default "where do I start." |
| **PageSpeed Insights** (pagespeed.web.dev) | Lab + field | Runs Lighthouse *and* shows this URL's CrUX field data side by side — the quickest lab-vs-field gut check. |
| **Chrome DevTools — Performance panel** | Lab | Flame chart, long tasks, layout-shift markers, the actual call stacks. Where you go once Lighthouse says *what* is slow and you need *why*. |
| **DevTools — Performance Insights / "Live Metrics"** | Lab-ish | Real-time LCP/CLS/INP as you click around locally. Good for INP hunting since Lighthouse can't. |
| **`web-vitals` npm library** | Field | 2 KB. Emits real LCP/INP/CLS/TTFB/FCP with attribution. The foundation of topic 08. |
| **CrUX** (Chrome UX Report — BigQuery, API, dashboard) | Field | Real-user p75 for any popular origin, including competitors. 28-day rolling. |
| **WebPageTest** | Lab | Multi-location, real devices, filmstrip + waterfall depth Lighthouse doesn't have. |

---

## The baseline (measured this branch)

Production build (`npm run build`), served by `vite preview`, Lighthouse 12.

### Build output

```
dist/index.html    0.68 kB
dist/assets/index-*.css    2.46 kB  (gzip 0.98)
dist/assets/index-*.js   259.5 kB  (gzip 82.5)   ← single chunk, everything in it
```

One JS chunk: React + React-DOM + react-router + **all of date-fns** + every page
component, loaded up front regardless of which route you land on.

### Lighthouse scores

| | Desktop | Mobile (4× CPU, slow-4G emulation) |
|---|---|---|
| **Performance score** | 79 | 53 |
| FCP | 0.5 s | 3.1 s |
| **LCP** | 1.6 s | **5.9 s** (poor) |
| TBT | 0 ms | 0 ms |
| **CLS** | **0.30** (poor) | **0.36** (poor) |
| Speed Index | 0.8 s | 4.4 s |

Read this as: **CPU isn't the problem** (TBT 0 — the O(n·m) related-posts loop is
trivial at 15 posts, and there's little JS execution beyond React mount). The two
real failures are **LCP** and **CLS**, and both get much worse on mobile where the
network is slow. The machine + localhost make the *absolute* numbers flattering;
the *emulated mobile* column and the *opportunity list* are the honest signal.

### What Lighthouse flagged (the fix roadmap, in its own words)

| Opportunity | Est. saving | Root cause in our code | Fixed in |
|---|---|---|---|
| `prioritize-lcp-image` | ~430 ms | Cover `<img>` is discovered late (in a lazy React render), not preloaded, no `fetchpriority`. | topic 03 |
| `uses-rel-preconnect` | ~300 ms | `fonts.googleapis.com`, `fonts.gstatic.com`, `picsum.photos`, `pravatar.cc` — four cross-origin hosts, zero `preconnect`. | topic 03 |
| `render-blocking-resources` | ~260 ms | Google Fonts `<link rel=stylesheet>` in `<head>` blocks first paint. | topic 03 |
| `modern-image-formats` | ~354 KiB | Cover images served as JPEG, not AVIF/WebP; also unsized and full-bleed. | topic 03 |
| `unused-javascript` | ~38 KiB | No code-splitting — post-page + comments + all of date-fns ship on the feed route. | topic 02 |
| `unsized-images` (CLS) | — | No `width`/`height` or `aspect-ratio` on cover + avatar `<img>` → content jumps when each image loads. **This is the entire 0.30 CLS.** | topic 05 |

CLS score breakdown confirmed it: every layout-shift entry is a `<img class="card__cover">`
or `<img class="avatar">` pushing text down as it arrives.

---

## What this branch establishes

1. **A vocabulary:** LCP (loading), INP (responsiveness), CLS (stability) as the
   three that matter; TTFB/FCP/TBT/SI as the diagnostics that explain them.
2. **A method:** lab (Lighthouse, this doc) to find causes → field (topic 08) to
   confirm they matter → p75, never averages.
3. **A "before" row** for every later topic to beat: score 79/53, LCP 1.6/5.9 s,
   CLS 0.30, one 82 KB-gzip chunk.

---

## Next questions this raises

**Q1 — The single 259 KB chunk: how much of it does the feed route actually need,
and what's the cost model for splitting it?** Route-based `React.lazy` + `Suspense`
vs. component-level splitting; what `date-fns` (imported whole) actually costs vs.
`date-fns/format` deep imports vs. `Intl.DateTimeFormat` with zero dependency;
whether a vendor chunk helps or hurts caching. → **topic 02**.

**Q2 — LCP is "poor" on mobile but we don't even know which element it is per
device.** Need to identify the LCP element, then walk its timeline: TTFB → resource
discovery → request start → download → render. Which of those phases is the
430 ms Lighthouse wants back, and do preconnect / preload / `fetchpriority` /
modern formats each attack a *different* phase? → **topic 03**.

**Q3 — CLS is entirely images with no dimensions. Is `width`/`height` enough, or
do we need `aspect-ratio` / CSS containment, and what about the font swap (FOUT)
and late-injected content (the "Related" block, comments)?** → **topic 05**.

**Q4 — TBT is 0 in the lab but that says nothing about INP.** How do we measure
interaction latency locally (the like button, the comment textarea, route
transitions), and at what input rate / list size does the O(n·m) scoring or an
unmemoised re-render actually start dropping frames? → **topic 04**.

**Q5 — Every number here is lab, on a fast machine over localhost.** What does the
minimal RUM setup look like — `web-vitals` → an endpoint — and which dimensions
(device, connection, route, build id) do you have to attach for the data to be
actionable? → **topic 08**.
