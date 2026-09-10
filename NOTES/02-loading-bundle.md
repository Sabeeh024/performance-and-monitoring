# 02 — Loading: bundle analysis + code-splitting

Resolves **Q1** from [01](01-metrics-baseline.md): what's in the 259 KB chunk, and
what does splitting actually buy.

| | branch |
|---|---|
| Bundle analysis + splitting + Intl dates | `topic/02-loading-bundle` (off `topic/01`) |

```
git switch topic/02-loading-bundle
npm run build      # writes dist/stats.html — open it
```

---

## Part 1 — How to see inside a bundle

### rollup-plugin-visualizer (added to `vite.config.js`)

```js
visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true })
```

Every build writes a treemap. Box size = bytes; nesting = folder structure. This
is the first thing to open when someone says "the bundle is too big" — it turns
a number into "oh, it's *that* library."

**Gotcha:** the visualizer gzips each module *in isolation*, so its per-module
gzip numbers add up to more than the real file (gzip compresses far better across
the whole concatenated bundle). Trust the **`vite build` summary line** for the
real transferred size; use the visualizer for **proportions**, not absolutes.

### Other tools

| Tool | Notes |
|---|---|
| `source-map-explorer dist/assets/*.js` | Attributes every byte of the built file back to a source file via the sourcemap. More precise than the visualizer for "which of my files". Needs `build.sourcemap`. Can choke on esbuild/rolldown maps (`column Infinity`). |
| `vite-bundle-visualizer` | Zero-config wrapper — `npx vite-bundle-visualizer`, no config edit. |
| `npx source-map-explorer` in CI + `size-limit` | Budget enforcement — topic 07. |
| DevTools → Coverage tab | Runtime "how much of this shipped JS/CSS actually executed on this page" — complements static analysis. |

### What was in our entry chunk (before)

Real gzip ≈ 82.5 KB. Proportions from the visualizer:

| Module | raw | share |
|---|---|---|
| `react-dom` | 449 KB | ~60% — the framework. Not going anywhere. |
| `react-router` | 90 KB | ~16% |
| **`date-fns`** | **45 KB** | **~11% — imported whole for two functions** |
| `react` + `scheduler` | 25 KB | ~5% |
| **all our app code** | ~10 KB | ~4% |

The lesson before touching anything: **our code is a rounding error.** The weight
is framework + one fat utility import. That dictates the strategy — there's no
point hand-optimising components; go after the dependency and the loading
*strategy*.

---

## Part 2 — Dependency cost & tree-shaking

**Tree-shaking** = the bundler drops exports you never import — *if* it can prove
they're side-effect-free. It works on ES modules, not CommonJS, and is defeated by
`sideEffects: true` in a package's `package.json` or by importing a namespace.

`date-fns` v3+ *is* ESM and tree-shakeable, so why 45 KB for two calls?

| Import style | Cost | Why |
|---|---|---|
| `import { format } from 'date-fns'` | pulls the barrel; bundler usually still shakes it | but `formatDistanceToNow` drags in the locale system, `formatDistance` tables, and a chain of internal helpers |
| `import format from 'date-fns/format'` | smaller | deep path skips the barrel; still carries `format`'s own token parser |
| **`Intl.DateTimeFormat` / `Intl.RelativeTimeFormat`** | **0 KB** | built into the engine; handles locales, timezones, plurals for free |

We took the third option ([`src/lib/formatDate.js`](../src/lib/formatDate.js)) —
create the formatter once at module scope, call `.format()` per use. Result:
**−21 KB raw / −5.8 KB gzip** off the entry chunk, no dependency, arguably better
i18n. `date-fns`/`dayjs`/`luxon` earn their place when you need parsing, arithmetic
(`addDays`), or duration formatting Intl doesn't cover — not for display alone.

**Barrel files (`index.js` re-exports):** convenient, but a deep `import { X }
from '../feature'` can force the bundler to load the whole barrel before shaking.
Keep barrels thin, or import from the concrete file on hot paths.

---

## Part 3 — Code-splitting

### What it is and isn't

Splitting **does not reduce total bytes** — it usually adds a few KB of overhead
(chunk boilerplate, a load waterfall). What it does: **move bytes off the critical
path** so the first screen ships less and the rest arrives on demand.

Payoff is proportional to **how much code is route-/interaction-specific**. On an
app whose weight is all framework (like ours *was*), route-splitting the page
components saved ~2 KB gzip — nearly nothing.

### `React.lazy` + `Suspense`

```jsx
const PostPage = lazy(() =>
  import('./pages/PostPage').then((m) => ({ default: m.PostPage })),
)
// ...
<Suspense fallback={<Spinner />}>
  <Routes>…</Routes>
</Suspense>
```

- `lazy` takes a function returning `import()` (a dynamic import — Vite/Rollup
  makes each one a separate chunk automatically).
- **Named-export gotcha:** `lazy` wants a module whose `default` is the component.
  Our pages use named exports, hence the `.then(m => ({ default: m.X }))` adapter.
  Default-exporting your route components avoids it.
- Every `lazy` component needs a `<Suspense>` boundary above it, or React throws.
  One boundary can cover many.
- **Route-level** (wrap the router) is the default cut — highest ratio of
  split-code to boundaries. **Component-level** (a heavy modal, a chart, a rich
  editor, below-the-fold sections) is the next cut once a specific component is
  the problem.

### The demonstration that makes the point

We gave post bodies real Markdown and render them with `marked` + `dompurify`
(sanitising `dangerouslySetInnerHTML` — never skip the sanitise step). Those libs
are **~24 KB gzip**. Because `PostPage` is lazy:

| Chunk | gzip | Loaded when |
|---|---|---|
| `index` (entry, feed) | 74.4 KB | always |
| `PostPage` | **24.3 KB** | only when a post is opened |
| `CommentsSection` | 0.9 KB | only on a post (lazy inside PostPage) |
| `FeedPage`, `posts` (shared) | 0.6 + 1.8 KB | feed + post |

Counterfactual: without splitting, that 24 KB would sit in the entry chunk and
**every feed visitor would download a Markdown renderer they never see** — entry
would be ~98 KB gzip instead of 74. *That's* the win: not smaller, but paid by
the people who actually use the feature.

### Measured (feed route, Lighthouse 12)

| | baseline (01) | after (02) |
|---|---|---|
| entry JS, gzip | 82.5 KB | **74.4 KB** |
| chunks | 1 | 6 (1 entry + 3 routes + 1 shared + 1 lazy component) |
| desktop score | 79 | 84 |
| mobile score | 53 | 54 |
| LCP mobile | 5.9 s | 5.4 s |
| `unused-javascript` | 38 KB | 30 KB |

Scores barely moved because **LCP is still the cover image over a slow link**
(topic 03) and **CLS is still unsized images** (topic 05). Bundle work was
necessary hygiene and set up the pattern, but it was never going to fix this
page's headline metrics. That's a real lesson about sequencing: *measure first,
or you'll spend a day shaving 8 KB while a 350 KB image sits untouched.*

---

## Advanced / adjacent (brief)

- **Vendor chunk / `manualChunks`** — splitting `react`/`react-dom`/`router` into
  their own long-cached chunk so an app-code deploy doesn't bust the framework
  cache. Real but nuanced (over-splitting hurts). → **topic 07**.
- **Preloading lazy routes** — a lazy route has a load delay on click. Mitigate by
  triggering `import()` on link hover/focus, or `<link rel="modulepreload">` for
  the likely-next route. Vite injects modulepreload for static imports already.
- **`React.lazy` limitations** — client-only, no SSR. Frameworks (Next, Remix,
  React Router's own data APIs) do route splitting + preloading + SSR together;
  `next/dynamic` is the SSR-capable equivalent.
- **RSC / server components** — the logical endpoint: components that never ship
  JS to the client at all. Out of scope here; worth knowing it exists.
- **Import-on-visibility** — our `CommentsSection` is below the fold but its chunk
  loads as soon as `PostPage` mounts (Suspense triggers the import on render).
  Deferring to an `IntersectionObserver` is possible but rarely worth it for a
  1 KB chunk; matters for a heavy embed.

---

## Next questions this raises

**Q6 — The cover image is now provably the LCP bottleneck and bundle work didn't
touch it.** Walk the LCP timeline for the image: it's `<img>` deep in a lazy
React render, so it's discovered late, requested late, over a cross-origin host
with no `preconnect`. Which fix attacks which phase — `preconnect`, `preload` /
`fetchpriority=high`, `loading=eager` for the LCP image vs `lazy` for the rest,
responsive `srcset`, AVIF/WebP, and a real CDN with sizing params? → **topic 03**.

**Q7 — Splitting added a load waterfall: `index.js` → `PostPage.js` → `posts.js`
→ data fetch.** How deep is that chain on a real connection, and does
`modulepreload` / route preloading on hover collapse it? → **topic 03 / 06**.

**Q8 — `marked` parses Markdown synchronously on every PostPage render.** At what
body size does that become a long task / INP problem, and is `useMemo`, a web
worker, or parsing-to-HTML-at-build-time the right answer? → **topic 04**.

**Q9 — We turned sourcemaps on.** What's the cost/benefit in production —
debuggability and RUM stack traces vs. exposing source and a larger deploy — and
how do error tools (Sentry) consume them without shipping them to users? →
**topic 07 / 08**.
