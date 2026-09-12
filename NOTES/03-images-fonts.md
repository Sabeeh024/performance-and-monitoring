# 03 — Assets: images, fonts, the critical path

Resolves **Q6 / Q7** from [02](02-loading-bundle.md): the LCP timeline and the
render-blocking font. This is the topic where the mobile score actually jumps.

| | branch |
|---|---|
| Font self-hosting + responsive/prioritised images | `topic/03-images-fonts` (off `topic/02`) |

---

## The mental model: the critical rendering path

Between "HTML arrives" and "LCP paints" the browser must:

1. **Parse HTML** → discover subresources. The *preload scanner* races ahead of
   the main parser looking for `src`/`href` to kick off early.
2. **Fetch + parse CSS** — render-blocking. Nothing paints until the CSSOM is ready.
3. **Fetch fonts** — but only *after* CSS parses and the browser matches an
   element to a `@font-face` (fonts are discovered late by nature).
4. **Fetch the LCP image** — discovered when its `<img>` is parsed (or when React
   renders it, in an SPA — later still).
5. **Lay out + paint.**

Every fix below targets one specific step. Naming the step is the skill.

---

## Fonts

### Before: render-blocking, cross-origin

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:..." rel="stylesheet" />
```

Costs, in order: DNS+TCP+TLS to `fonts.googleapis.com` → download the CSS
(render-blocking) → *that* CSS `@import`s from `fonts.gstatic.com` → new
connection → download woff2. Two cross-origin handshakes on the critical path
before text can paint. (It also is **not** a privacy or caching win any more —
since 2020 browsers partition cache per-site, so "the user already has Inter from
another site" is a myth.)

### After: self-hosted, same-origin, preheated

1. **Copy the woff2 into the app** (`public/fonts/…`, latin subset only, ~47 KB
   for variable Inter). One file, own origin, own cache headers.
2. **`@font-face { … font-display: swap }`** — paint immediately in the fallback,
   swap to Inter when it loads. Alternatives: `optional` (use fallback if the
   font isn't ~instant — best for CLS, gives up on the webfont on slow links);
   `block` (invisible text up to 3 s — almost never what you want).
3. **Preload it:**
   ```html
   <link rel="preload" href="/fonts/…woff2" as="font" type="font/woff2" crossorigin />
   ```
   Moves the font fetch from step 3 up to step 1. **`crossorigin` is mandatory
   even same-origin** — fonts fetch in CORS mode; without it the preload is a
   *second*, unused request.
4. **Metric-compatible fallback stack** — pick fallbacks whose glyph metrics are
   close to Inter (`-apple-system, Segoe UI, Roboto, Helvetica, Arial`) so the
   `swap` reflow is small. The precise version of this is the
   `size-adjust` / `ascent-override` descriptors on an `@font-face` for the
   fallback (what `next/font` and Fontaine generate automatically). → deeper in
   topic 05.

**Result: FCP mobile 3.2 s → 1.3 s.** The font stopped blocking first paint.

### Brief: subsetting & variable fonts

- Ship only the `unicode-range` you use (`latin` vs `latin-ext` vs everything).
  `glyphhanger` / `subfont` automate this.
- One **variable** font file replaces 4–6 static weights if you use more than two.
  One weight? Static is smaller.

---

## Images

Images were **both** LCP failures **and** the entire CLS. Five independent fixes:

### 1. Dimensions → no layout shift

```jsx
<img src={…} width={1200} height={630} />        // real attributes, not CSS
```
```css
.card__cover { width: 100%; height: auto; aspect-ratio: 1200 / 630; }
```

The `width`/`height` **attributes** give the browser the intrinsic ratio, so it
reserves the right box *before* a single byte of the image arrives. With
`width:100%; height:auto` the rendered size still scales fluidly. `aspect-ratio`
in CSS is the belt-and-braces. **CLS 0.30 → ~0** from this alone.

### 2. `loading` — lazy vs eager, deliberately

- Below-the-fold images: `loading="lazy"` — the browser skips them until the user
  scrolls near. 14 of our 15 feed covers + all avatars.
- **The LCP image must be `loading="eager"`** (the default, but be explicit).
  A lazy LCP image is a classic self-inflicted wound — Lighthouse has a dedicated
  `lcp-lazy-loaded` audit for it.

### 3. `fetchpriority` — who wins the bandwidth race

```jsx
<img fetchPriority="high" … />   // the one LCP image
<img fetchPriority="low"  … />   // the other 14 covers
```

By default images are "Low" priority until layout proves they're in-viewport.
`high` tells the browser *now*, before layout. `low` on the rest stops 14 images
from contending with the LCP fetch and the JS on a slow link.

### 4. Responsive images — `srcset` + `sizes`

```jsx
<img
  srcSet="…/320/168.webp 320w, …/640/336.webp 640w, …/1200/630.webp 1200w"
  sizes="(max-width: 900px) 100vw, 868px"
/>
```

- `srcset` with `w` descriptors = "here are the same image at these pixel widths."
- **`sizes` = "here's how wide it will render"** — the browser needs this to pick
  from `srcset` *before* layout. Omit it and `srcset` is decorative (defaults to
  `100vw`). Get it wrong and you ship the wrong file.
- A phone at 375 CSS px now downloads a ~40 KB image, not the 200 KB desktop one.
- **Gotcha we hit:** for an `eager`+`high` image, the preload scanner fires
  *before* layout, so `sizes` resolves against a 0-width box and it grabs the
  *smallest* candidate (320w) — then re-fetches the right one after layout. Two
  requests. For a fixed-size hero, a plain `src` at the known size, or a
  `<link rel=preload as=image imagesrcset= imagesizes=>` in the HTML, avoids it.

### 5. Modern formats — WebP / AVIF

picsum serves WebP when the URL ends `.webp` — so we just ask for it. A real
image CDN (Cloudinary, imgix, Vercel/Netlify Image, `images.weserv.nl`) goes
further: it reads the `Accept` header and returns **AVIF** to browsers that
support it (~30% smaller than WebP again), plus a quality knob (`q=70` is usually
invisible). The `<picture>` element is the no-CDN way:

```html
<picture>
  <source srcset="cover.avif" type="image/avif" />
  <source srcset="cover.webp" type="image/webp" />
  <img src="cover.jpg" width alt />
</picture>
```

Build tools (`vite-imagetools`, `@astrojs/image`, `next/image`) generate the
variants at build time.

---

## Measured

| | 01 baseline | 02 bundle | 03 assets |
|---|---|---|---|
| **Feed mobile score** | 53 | 54 | **88** |
| Feed mobile LCP | 5.9 s | 5.4 s | **3.8 s** |
| Feed mobile FCP | 3.1 s | 3.2 s | **1.3 s** |
| **CLS** (all routes) | 0.30 | 0.20 | **~0.007** |
| Post mobile score | ~53 | — | **98** |
| Post mobile LCP | — | — | **2.2 s** |
| Feed desktop score | 79 | 84 | **93** |

The three things that moved the needle: **font off the critical path** (FCP),
**image dimensions** (CLS), **right-sized WebP + priority hints** (LCP).

### What's still on the feed-mobile report

| Audit | Why it remains |
|---|---|
| `prioritize-lcp-image` (~330 ms) | The LCP image URL is data-driven (comes from the API), so it can't be `<link rel=preload>`ed in the static HTML. This is the SPA ceiling — SSR / a framework that renders the `<img>` server-side, or an API that returns a hero URL early, is the real fix. |
| `render-blocking-resources` (~150 ms) | Now it's our own 2.75 KB `index.css`. Inlining critical CSS + async-loading the rest closes it; marginal at this size. |
| `unused-javascript` (~29 KB) | react-dom + router code paths — structural, see topic 02. |

---

## Advanced / adjacent (brief)

- **Priority Hints beyond images** — `fetchpriority` works on `<link>`, `<script>`,
  and `fetch()` too.
- **`rel=preload` vs `prefetch` vs `preconnect` vs `dns-prefetch`** — preload:
  "I need this for *this* page, fetch now at high priority." prefetch: "I'll
  probably need this for the *next* navigation, fetch when idle." preconnect:
  "open a connection to this origin, I'll use it soon." dns-prefetch: just the
  DNS, cheaper, wider browser support — good as a preconnect fallback.
- **`Speculation Rules` API / `<link rel=prerender>`** — prefetch or fully render
  the likely next page. Powerful, easy to waste bandwidth with.
- **Critical CSS** — inline the ~subset needed for above-the-fold, defer the rest
  (`media="print"` onload swap, or `<link rel=preload as=style>`). Tools: `critters`
  (now `beasties`), `critical`. Vite doesn't do it out of the box.
- **HTTP/2-3 & compression** — brotli over gzip for text; H/2 multiplexing makes
  "concatenate everything" less necessary but domain sharding harmful. Mostly a
  CDN/server config concern → topic 06/07.
- **CDN image params as a discipline** — never request an image bigger than its
  largest rendered size × max DPR you support (cap at 2–3). "Retina" past 3x is
  imperceptible and quadratic in bytes.

---

## Next questions this raises

**Q10 — CLS is ~0 in the lab, but two shift sources are untested:** the font
`swap` (FOUT) and late-injected content (the "Related" block and comments appear
after fetches). Do they shift layout on a real slow connection, and does
`font-display: optional` / `size-adjust` / reserving space for the async sections
matter? → **topic 05**.

**Q11 — `marked.parse()` still runs synchronously in `PostPage` render** (Q8,
carried). Now that the page is fast, is Markdown parsing the next main-thread
cost, and what does the Performance panel show for it? → **topic 04**.

**Q12 — We added an in-memory cache (`peekPost`) as a hack to get the LCP image
into the first render.** What does a real client cache look like (React Query /
SWR / router loaders), how does it handle staleness and the feed→post→feed
round-trip, and does it also fix the split-chunk waterfall from Q7? → **topic 06**.

**Q13 — The `prioritize-lcp-image` gap is unclosable client-side.** How much do
SSR / SSG / streaming actually buy for LCP and FCP, and what do they cost? A
*brief* look, not a framework migration. → **topic 07**.

---

### Postscript — the peek cache had a bug, and it's the instructive kind

`getPosts()` (the feed fetch) strips `body` from every post before caching it,
so the list response doesn't ship ~800 full Markdown bodies. `peekPost(id)`
reads that same cache. Consequence: navigating **feed → post** seeds `PostPage`
with a real cached object that has everything *except* `body` — and the original
code treated "we have a post object" as "we have a fully loaded post," calling
`marked.parse(post.body)` with `body: undefined`. Crash, on every single
feed-to-post click.

It passed every smoke test in this topic and in topic 04 because all of that
testing **loaded `/post/:id` directly** (a fresh page load — empty cache, `peek`
returns `null`, spinner shows, `getPost()` fills in the body before anything
renders). Direct-load and feed-click are different code paths through the same
component, and the optimization's entire reason for existing (a warm cache) is
also exactly what made the fresh-load tests blind to it. Fixed by gating the
body-dependent markup on `post.body` specifically instead of on `post` being
truthy — title/author/date (present in the stripped cache) still render
instantly; only the Markdown block waits and shows its own spinner.

**The lesson, generalized:** an optimization that keys off "has this been visited
before" needs its test to actually visit-before — a fresh load and a warm-cache
load are not the same code path even though they render the same component.
Smoke-testing only the direct URL missed it here every time.
