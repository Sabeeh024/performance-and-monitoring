# 07 — Build & delivery

Resolves **Q9** (topic 02: source maps in production), **Q13** (topic 03:
SSR/SSG, brief), and **Q17** (topic 04: is the chunk graph invalidating the
framework cache on every deploy).

| | branch |
|---|---|
| Vendor splitting, hidden source maps, bundle budgets | `topic/07-build-delivery` (off `topic/06`) |

---

## Vendor chunk splitting

Found the real version of Q17's worry: editing `FeedPage.jsx` — a lazily
loaded route — also changed the **entry chunk's** hash, not just FeedPage's.
The entry embeds `import("./FeedPage-<hash>.js")` as a literal string, so any
route's hash change propagates to whatever imports it — in this app, that was
the same chunk holding React/React-DOM/router/React Query. Every deploy was
forcing every visitor to re-download the whole framework.

```js
// vite.config.js
manualChunks(id) {
  if (!id.includes('node_modules')) return undefined
  if (/react-dom|\/react\/|react-router/.test(id)) return 'vendor-react'
  if (id.includes('@tanstack')) return 'vendor-query'
},
```

Verified directly: edited `FeedPage.jsx`, rebuilt twice. `vendor-react-*.js`
and `vendor-query-*.js` came out **byte-for-byte identical** both times; only
the small route/glue chunks changed hash.

## Source maps: `hidden`, not `true`

`sourcemap: true` appends `//# sourceMappingURL=...` to every shipped file —
which is exactly what let anyone's DevTools fetch the map and browse fully
reconstructed original source, comments included (the same mechanism topic
02 used for its own bundle analysis). Switched to `sourcemap: 'hidden'`: the
`.map` files still exist for tooling, the comment is gone.

**Nuance, also verified:** the `.map` is still fetchable directly at its URL
(`curl` returns 200) — `hidden` removes auto-discovery, not access. Real
protection means excluding `.map` files from the deployed static assets after
uploading them to an error-tracking service, not just this flag.

## Bundle budgets that fail CI

`size-limit`, with a per-chunk gzip budget in `.size-limit.json`
(`npm run size`, exit 1 on a miss). Verified both directions: passes clean
against the current build; injecting ~5 KB of dead code into `main.jsx`'s
import graph fails with the specific chunk and overage named, exit 1.

**Scope, stated precisely:** this catches *bytes shipped*, not runtime
behavior — it would **not** have caught topic 04's 14k-DOM/890ms-TBT
regression, because that changed rendering cost, not bundle size. Runtime
budgets are a different tool's job (Lighthouse CI) — topic 08.

---

## Brief / adjacent

- **Modern/legacy builds** — this app ships one modern ES modules build (no
  `@vitejs/plugin-legacy`, no `nomodule` fallback). That's the right default
  today: legacy bundles + polyfills add real weight for a shrinking slice of
  users. Add it only if you have actual traffic data showing legacy browsers
  matter for your audience.
- **Dependency pre-bundling** — Vite's dev-server-only optimization (esbuild
  pre-bundles CJS/mixed-format deps into ESM so the dev server doesn't issue
  hundreds of tiny module requests). Doesn't affect the production build.
- **SSR/SSG/streaming (Q13)** — buys a real LCP/FCP win because the first HTML
  response already contains content instead of an empty `<div id="root">`.
  Costs: server infrastructure (or a build-time SSG step), and reintroduces
  topic 05's hydration-delay concern — the page can *look* ready before its
  event handlers are attached. Right call for content-heavy, public,
  SEO-relevant pages; not a fit for every app, and not a small migration for
  an existing CSR app like this one — noted, not attempted here.

---

## Next questions this raises

**Q24 — The budgets in `.size-limit.json` were picked by hand, once, with
headroom guessed from the current build.** What's the actual process for
setting and revisiting a bundle budget on a real team — per-PR diff vs. an
absolute ceiling, who owns raising it, how often it's revisited?

**Q25 — Everything about "did this deploy help or hurt" so far has been a
before/after `npm run build` comparison, run by hand.** How does a real
pipeline surface this automatically — a bot comment on a PR with the size
diff, a dashboard, a failed check? → the tooling side of **topic 08**.
