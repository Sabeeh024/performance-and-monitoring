# 05 — Layout stability & interactivity

Resolves **Q10** from [03](03-images-fonts.md): were the font swap and
late-injected content actually shift-free, or just untested? Also the
curriculum's INP items: event handler cost, debounce/throttle, breaking up
work. (Hydration delay is noted but doesn't apply yet — this app is client-only
until topic 07's SSR brief.)

| | branch |
|---|---|
| CLS re-testing + debounce/throttle/chunking | `topic/05-layout-inp` (off `topic/04`) |

---

## Part 1 — CLS: actually testing the two untested causes

Topic 03 left CLS at ~0 in the lab but flagged two sources nobody had actually
tried to trigger: font swap (FOUT) and content injected after a fetch (Related,
Comments). "It measured zero" and "it can't happen" are different claims —
this section tells them apart.

### Font swap: measured, not assumed

Ran Lighthouse's `layout-shifts` audit against `/post/:id` (mobile, throttled):
**zero shift items.** Then deliberately broke the thing that might be
protecting it — swapped the metric-compatible fallback stack for `Georgia,
'Times New Roman', serif` (wildly different letter widths) and re-ran.
**Still zero.**

That's not "fallback matching doesn't matter" — it's a different, more
specific finding. Pulling the actual resource timing out of the trace:

```
font request (woff2, preloaded): finishes at   24 ms
First Contentful Paint:                      1,500 ms
```

**The font is fully downloaded 1.47 seconds before the browser paints any
text at all.** `font-display: swap` never gets a chance to swap anything —
there's no gap between "fallback painted" and "real font arrived" for a swap
to fill, because the font won the race by a huge margin. Preloading (topic 03)
didn't just make the font arrive faster — on this app, over this connection, it
made it arrive so much faster that the entire FOUT window collapsed to nothing.

**What this does and doesn't prove:** metric-compatible fallback fonts are
still correct defense-in-depth — they protect the case this test doesn't hit
(a cache miss, a slower connection specifically for the font, a browser that
drops the preload). But on *this* measured setup, the fallback-matching work
from topic 03 isn't currently the thing preventing CLS; the preload is doing
all of it. Worth knowing which lever is actually load-bearing before you
spend more effort tuning the one that isn't.

### Injected content: also zero, and the reason is simpler

The Related block and Comments section render only after their fetches
resolve — content appearing where there was nothing. Lighthouse's shift-item
list is empty here too, and the explanation doesn't need a trace: both sections
render **below the article body**, which on any real post is already taller
than one viewport. Content shifting in below the fold doesn't move anything
the user can currently see — CLS only scores shifts of elements within the
viewport. This isn't a mechanism we built (nothing reserves space for these
sections); it's incidental to the page being long enough that it doesn't need
to be.

**The lesson generalizes:** async-injected content is only a CLS risk when it
lands *above* something the user is already looking at, or when the page is
short enough that "below the fold" isn't below anything. A newsletter-signup
banner injected above an article's first paragraph, or a "read more" section
injected into a short post, would show up in this same test as a real,
nonzero score. Test the actual shape of your content, not just "does this
pattern have CLS in general."

---

## Part 2 — INP: event handler cost and the tools that aren't concurrent React

Topic 04 covered `useDeferredValue`/`useTransition` — React's answer to keeping
*rendering* responsive. INP has an older, framework-agnostic toolset for the
other half: reducing how often a *handler* runs, and keeping any given run of
it short.

### Debounce — collapse a burst into one call

```js
export function debounce(fn, ms) {
  let timer = null
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}
```

Wired to the feed's search box, logging to a (simulated) analytics endpoint:
typing "design" character by character — 6 keystrokes — fires **exactly one**
logged call, carrying the final value, ~500 ms after the last keystroke.
Verified directly: polling the UI through the whole sequence shows a single
state transition, not six.

**Right for:** anything where only the *final* value matters and firing early
is wasted work — analytics, autosave, a search-as-you-type API call.
**Wrong for:** anything that needs to track a gesture *while it happens* — see
throttle.

### Throttle — cap the rate, don't collapse to one

```js
export function throttle(fn, ms) {
  let last = 0, timer = null
  const throttled = (...args) => {
    const now = Date.now()
    const remaining = ms - (now - last)
    if (remaining <= 0) { clearTimeout(timer); last = now; fn(...args) }
    else { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); fn(...args) }, remaining) }
  }
  throttled.cancel = () => clearTimeout(timer)
  return throttled
}
```

Wired to a reading-progress bar on `PostPage`, driven by `window`'s `scroll`
event (there's no ResizeObserver-style native batching for scroll position —
throttling the listener is still the standard tool here). Verified: firing
~40 synthetic scroll events in 400 ms produced **exactly 4** actual bar
updates — the 100 ms cap held regardless of how fast the events arrived.

The bar itself animates via `transform: scaleX()`, not `width` — the
compositor-only animation rule from topic 04, applied for real this time
instead of just stated.

### Debounce/throttle vs `useDeferredValue`/`useTransition` — not the same problem

Easy to conflate; genuinely different layers:

| | protects | typical partner |
|---|---|---|
| `useDeferredValue` / `useTransition` | React's **render** scheduling — keeps the UI thread free during an expensive re-render | still fires on every input |
| `debounce` / `throttle` | how often a **side effect** (network call, external API, non-React work) runs at all | often used *alongside* the above |

The feed search box actually uses **both**, doing two different jobs on the
same keystroke: `useDeferredValue` keeps the 800-item re-filter from blocking
the input (topic 04); `debounce` separately keeps the analytics call from
firing 6 times instead of 1. Removing either one reintroduces a different
problem — deferred-but-undebounced would filter smoothly but spam the log;
debounced-but-undeferred would log once but could still jank the input on a
slower device.

---

## Part 3 — Breaking up a genuinely long synchronous task

Not every expensive operation is a re-render or a high-frequency event — some
are just one big function call. Measured: rendering a Markdown preview for all
800 posts (a realistic "export with content preview" feature) takes **~50 ms**
unthrottled, confirmed via the long-task observer as **exactly one 54 ms task**.

```js
// One synchronous pass — the whole thing is a single long task.
export function buildCsvSync(posts) {
  return [HEADER, ...posts.map(toRow)].join('\n')
}

// Same work, cut into pieces with a yield between each.
export async function buildCsvChunked(posts, { chunkSize = 50, onProgress } = {}) {
  const rows = [HEADER]
  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    for (const post of chunk) rows.push(toRow(post))
    onProgress?.(Math.round(((i + chunk.length) / posts.length) * 100))
    await yieldToMain()
  }
  return rows.join('\n')
}
```

`yieldToMain` prefers `scheduler.yield()` (Chrome 129+, purpose-built for
exactly this — yield now, resume at normal priority) and falls back to
`setTimeout(fn, 0)` everywhere else — cruder, since it queues behind whatever
else is pending, but the same shape.

**Measured on `/insights` → Export**, with a `longtask` `PerformanceObserver`
running for each:

| | long tasks | output | total time |
|---|---|---|---|
| `buildCsvSync` (blocking) | **1 task, 54 ms** | 176,796 chars | 52 ms |
| `buildCsvChunked` | **0 tasks** | 176,796 chars (identical) | 51 ms |

**The point, stated precisely because it's easy to oversell:** chunking did
**not** make the work faster — total wall-clock time is the same either way,
and the yields themselves cost a little. What changed is that the *same* 50 ms
of work is no longer one atomic block the browser can't interrupt. Every yield
point is a chance for a pending click, keystroke, or frame to get handled
before the next chunk starts. A page also gets a visible progress indicator for
free, since `onProgress` naturally has somewhere to report between chunks —
the blocking version has nowhere to put one.

### A bug this surfaced, worth keeping: don't loosen a fix to unblock a new feature

Wiring this up crashed immediately: `marked(): input parameter is undefined`.
Cause: `getPosts()` (the feed's list fetch) strips `body` — the exact
optimization from topics 02/03 — so `/insights`, which only ever calls
`getPosts()`, never had bodies to render a preview from. The tempting fix is
loosening `getPosts()` to include `body` "just for this one page." The actual
fix was a **separate, explicit fetch** — `getAllPostsWithBodies()` — requested
lazily only when the Export tab opens. Same shape as the `PostPage` crash from
topic 04's postscript: a stripped-list optimization meeting a feature that
needs the stripped field, twice now. The fix both times was "give the feature
its own correctly-shaped request," not "make the list heavier for everyone."

---

## Brief / adjacent

- **Event handler cost & visual feedback** — a click's *visual* response (a
  button's pressed state, a heart icon toggling) should never wait on
  synchronous work the click also triggers. If a handler must do something
  expensive, update the visually-critical state first and defer the rest
  (`setTimeout`, a transition, or literally reordering the two `setState`
  calls) so the frame the user is watching for isn't gated on unrelated work.
- **Hydration delay** — the gap on an SSR page between "HTML is visible" and
  "event handlers are attached," during which the page looks ready but isn't.
  Doesn't apply here — this app has no server-rendered HTML to hydrate, it's
  client-rendered from an empty `<div id="root">`. Comes back properly in
  topic 07's SSR brief, where "looks interactive, isn't yet" is a real
  regression SSR/streaming can introduce if you're not careful (`selective
  hydration`, `islands` architectures exist specifically to bound this).
- **`isInputPending()`** — a lower-level cousin of the concurrent-rendering
  hooks: inside a manually-chunked loop, ask the browser "is there a pending
  input I should handle before continuing?" instead of yielding on a fixed
  schedule. More control, more code; `scheduler.yield()` / React's own
  scheduling cover most cases without it.
- **CLS from animations** — briefly, since topic 04 covered the mechanism:
  animating `top`/`left`/`margin` instead of `transform` doesn't just cost
  main-thread time, it can register as layout shift if it moves other content.
  Another reason `transform`-only animation (the reading-progress bar, here)
  is the default, not just a performance nicety.

---

## Measured — summary

| | Finding |
|---|---|
| Font-swap CLS | 0, because preload wins by 1.47 s — not because fallback-matching is doing the work here |
| Injected-content CLS | 0, because both sections land below the fold on any real post |
| Debounced analytics | 6 keystrokes → 1 call (verified) |
| Throttled scroll | ~40 events/400ms → 4 updates (verified) |
| Chunked export | 1×54ms long task → 0 long tasks, same output, same total time (verified) |

---

## Next questions this raises

**Q18 — Everything in this doc is a lab measurement on one machine.** Real
users are on real networks and real devices with real background tabs. What
does actual field INP/CLS look like, and how do you even collect it? →
**topic 08**, directly — this is the RUM topic.

**Q19 — The CLS finding depends entirely on this app's shape** (long posts,
small font, fast preload). A shorter page, a slower font host, or content
injected above the fold would all fail this same test. Is there a *general*
CLS testing practice beyond "run Lighthouse once," — e.g. testing your actual
worst-case content (shortest post, slowest connection profile) rather than a
typical one? Worth a checklist item in topic 08's final checklist rather than
new code here.

**Q20 — `scheduler.yield()` is Chrome-only and very new.** How much of the
"breaking up work" story changes on Safari/Firefox (no native yield API, only
the `setTimeout` fallback, which queues behind other macrotasks and is
measurably worse under load)? Not deep-diving it, but worth a one-line caveat
wherever this pattern gets reused.
