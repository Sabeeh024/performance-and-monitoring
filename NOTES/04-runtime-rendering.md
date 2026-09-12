# 04 — Runtime & rendering performance

Resolves **Q4** (INP / expensive loop), **Q8** and **Q11** (sync work in render).
Loading is handled; this is about what the main thread does *after* the page is up.

| | branch |
|---|---|
| Unoptimised — feature added, nothing fixed yet | `topic/04-runtime-rendering-unoptimized` |
| Optimised — all five fixes below applied | `topic/04-runtime-rendering` (off `topic/03`) |

```
git switch topic/04-runtime-rendering-unoptimized   # or topic/04-runtime-rendering
npm install && npm run dev
```

`-unoptimized` is a fixed pointer at the commit right after the feature landed
(`9bb1c75`) — it never moves. The three fix commits stack on top of it on
`topic/04-runtime-rendering` itself, so `git log topic/04-runtime-rendering` also
shows the fixes applied one at a time if you want to bisect the improvement
instead of jumping straight to before/after:

```
git log --oneline topic/04-runtime-rendering-unoptimized..topic/04-runtime-rendering
```

The setup: the feed got a **search box + tag filter + sort** over an **800-post**
seed. Realistic feature; it tanked the page.

| | topic 03 | +feature (unoptimised) |
|---|---|---|
| Feed mobile score | 88 | **67** |
| TBT | 0 ms | **890 ms** |
| DOM nodes | ~250 | **14,244** |
| Main-thread work | 0.4 s | 2.3 s |
| Keystroke → paint (unthrottled) | — | **80–115 ms** (~500 ms on a phone) |

Two separate problems, often conflated:
- **Load-time main-thread cost** (TBT / TTI) — rendering 800 cards on mount.
- **Interaction latency** (INP) — every keystroke re-filters 800 and re-renders
  the list.

---

## Diagnosing

| Tool | Shows |
|---|---|
| **React DevTools → Profiler** | Record an interaction → flamegraph of which components re-rendered, how long each took, and *why* ("props changed", "hooks changed", "parent rendered"). The first stop for re-render problems. |
| **React DevTools → "Highlight updates when components render"** | Live coloured borders on everything re-rendering. Type one key and watch 800 cards flash = the problem, visually. |
| **DevTools → Performance panel** | Record → the flame chart. Long tasks are flagged red; you see `filterSort`, React's `commitWork`, style/layout. "Interactions" track shows INP per interaction with the offending event. |
| **DevTools → Performance → "CPU: 4× / 6× slowdown"** | Always profile throttled. Your machine lies. |
| **DevTools → Performance Monitor / the field** | Real INP only comes from real users (topic 08) — the lab gives you TBT as a proxy and per-interaction timings while you click around. |

---

## Fix 1 — `useMemo` for derived data

```jsx
const results = useMemo(
  () => filterSort(posts ?? [], deferredQuery, tag, sort),
  [posts, deferredQuery, tag, sort],
)
```

- Recompute only when an input changes — not on every render (a parent render, a
  sibling state change, StrictMode's double-invoke).
- Bonus that matters here: **stable array identity** between unrelated renders,
  so `React.memo` children and the virtualizer don't see "new" data.

**When NOT to:** `useMemo` isn't free — it stores the deps array and the value,
and runs the comparison every render. For a cheap computation (`a + b`, a
`.filter` over 20 items) the bookkeeping costs more than it saves and it's noise.
Reach for it when the computation is measurably expensive **or** its result feeds
a memoised subtree. "Wrap everything in useMemo" is a real anti-pattern.

> The React Compiler (React 19+) auto-memoises and makes most manual `useMemo` /
> `useCallback` unnecessary. Until it's on in your build, the rules above hold.

---

## Fix 2 — `React.memo` + stable props

```jsx
export const PostCard = memo(function PostCard({ post, query, priority }) { … })
```

`memo` skips a re-render when props are shallow-equal to last time. It only works
if the props actually *are* stable:

- **`post`** — stable because the list is `useMemo`'d (Fix 1). Without that, every
  render makes a new array of the same objects and `memo` never hits.
- **`query`, `priority`** — primitives, compared by value, fine.
- **The traps:** `style={{…}}`, `onClick={() => …}`, `data={[…]}` written inline
  in JSX are a **new reference every render** → `memo` always misses. Fix with
  `useCallback` for handlers, `useMemo` for objects/arrays, or move constants out
  of the component (`const COVER_SIZES = '…'` at module scope).

**When NOT to:** `memo` adds a props comparison on every render. For a component
that's cheap to render, always rendered once, or whose props change every time
anyway, it's pure overhead. It pays off for **list items** and **wide subtrees**
that re-render because a parent did, not because their own data changed.

**`useCallback` specifically** is *only* useful when the function is passed to a
memoised child or used as an effect dependency. A `useCallback` whose result goes
straight onto a DOM element (`<button onClick={cb}>`) does nothing but cost.

---

## Fix 3 — `useDeferredValue` + `useTransition` (keep interactions responsive)

```jsx
const [query, setQuery] = useState('')
const deferredQuery = useDeferredValue(query)   // lags behind during bursts
const isStale = query !== deferredQuery
// input binds to `query`; the expensive list derives from `deferredQuery`
```

The keystroke handler now does only `setQuery` (trivial). React renders the input
update at high priority, then re-renders the big list from `deferredQuery` at low
priority — **interruptible**, so the next keystroke pre-empts it.

**Result: keystroke → input latency 80/49/23 ms → 4/2/1 ms.** The list still
takes time to catch up, but the *typing* never stalls, and you dim the stale list
(`isStale`) so it doesn't look frozen.

### `useDeferredValue` vs `useTransition` — both shipped, side by side

Same engine (concurrent rendering), different ergonomics, and the feed has one
of each so you can compare them directly:

| | use when | in this app |
|---|---|---|
| `useDeferredValue(value)` | you receive a value (a prop, controlled input) and want a lagging copy for the expensive part. No control over the setter. | the search `query` — bound to the input for instant typing; `deferredQuery` feeds the filter |
| `const [isPending, startTransition] = useTransition()` | *you* own the state update and can wrap it: `startTransition(() => setTag(next))`. Marks that update as non-urgent. Gives you `isPending`. | the tag/sort `<select>`s — `onChange` wraps `setTag`/`setSort` in `startTransition` |

```jsx
const [isPending, startTransition] = useTransition()
const onTagChange = (e) => {
  const value = e.target.value
  startTransition(() => setTag(value))
}
```

Why two mechanisms for what looks like the same problem: `query` is a value the
component already owns as local state that *changes very fast* (a keystroke
burst) — `useDeferredValue` gives you a second, lagging copy of it without
touching how you set it. `tag`/`sort` change in **discrete steps** (one click),
and there's no natural "value to lag" — you just want *this specific update* to
be low-priority and to know when it's still in flight. `useTransition` gives you
that directly via `isPending`, no second variable to thread through the tree.

Both feed the same visual signal here — `isBusy = isStale || isPending` dims the
list — but `isPending` additionally drives its own "· updating…" label, so the
two are visibly distinguishable when you try them: type fast vs. switch a tag.

**Honest result:** by the time this was added, the feed was already virtualized
and `filterSort` was already cheap (Fix 1) — so selecting a tag settles in
**~50 ms**, with or without `useTransition`. The pending state is real and
briefly visible, but there's no dramatic before/after number to report here the
way there was for virtualization. It's shipped for the *pattern* — the two hooks
solving the two shapes of "update I don't want to block on" — not because this
specific interaction was measurably broken. Same caveat as the Web Worker below:
add it because a profile showed a real gap, not because the API exists.

Neither hook makes the work *faster* — they make it **non-blocking and
interruptible** so it doesn't wreck INP. If the work is genuinely huge you still
need Fix 4/5.

### `/insights` — the same two hooks, where they're actually load-bearing

The feed's tag/sort example above is honest about being a demonstration more
than a fix. `/insights` (linked from the top bar) exists to show the same two
hooks doing real work, plus `ResizeObserver` — with every number below
**measured against this codebase**, not asserted.

| Hook / API | Where | Why it's real here |
|---|---|---|
| `useDeferredValue` | Search tab — typo-tolerant title search (Damerau-Levenshtein edit distance per word) | ~4 ms/800 posts unthrottled — small, but non-zero and per-keystroke; the input must not itself lag |
| `useTransition` | Opening the Trending tab | Trending is an **all-pairs** tag-overlap scan — O(n²) — ~20 ms/800 posts unthrottled, ~80-100 ms throttled — computed fresh every time the tab opens. A synchronous 20-80 ms render on click is a dropped frame; wrapping the tab switch means React can keep the rest of the page interactive while it resolves |
| `ResizeObserver` + `requestAnimationFrame` | `BarChart`, used by Overview | An SVG chart needs its *rendered* pixel width, which changes for reasons `window.resize` can't see (a sidebar, a tab switch, this very panel). rAF inside the callback avoids mutating state synchronously in a resize callback — the classic "ResizeObserver loop" trap |

One thing worth calling out because it didn't go as planned, which is more
instructive than if it had:

**The typo-tolerant search shipped with a real correctness bug, caught by
testing it rather than trusting it.** Plain Levenshtein distance charges **2**
for a transposition (`design` → `desing` swaps two letters), and a flat
`maxDistance: 3` is far too permissive for a 6-letter query — searching
`desing` returned 24 results, only 5 of which were actually about "design."
Fixed by switching to **Damerau-Levenshtein** (transposition costs 1) and
scaling the threshold to the query length instead of a flat number. Re-running
`desing` after the fix returns exactly the same 24 posts as searching `design`
outright. The fix also **cut the measured cost by ~5x** (22 ms → 4 ms) as a
side effect — the length pre-filter that correctness required also means most
title words never reach the expensive edit-distance call. A reminder that a
performance number measured against buggy logic isn't trustworthy — verify
correctness and cost together, not cost alone.

---

## Fix 4 — Virtualization (render only what's visible)

```jsx
const virtualizer = useWindowVirtualizer({
  count: results.length,
  estimateSize: () => 468,
  overscan: 4,
})
// render only virtualizer.getVirtualItems() — ~10 rows — inside a
// full-height spacer so the scrollbar is correct
```

**800 `<article>`s → ~10 in the DOM.** This is the single biggest win:

| | before | after |
|---|---|---|
| Feed mobile score | 71 | **89** |
| TBT | 790 ms | **0 ms** |
| DOM nodes | 14,244 | **143** |
| Main-thread work | 2.1 s | 0.4 s |

Notes:
- **Window vs element scroll:** `useWindowVirtualizer` (page scrolls) vs
  `useVirtualizer` (a scroll container with fixed height). Window scroll needs
  `scrollMargin` = distance from page top to the list.
- **Fixed vs variable row height:** a known fixed height is cheapest — no
  measurement. Variable heights (our cards) need `measureElement`, which does a
  layout read per row as it scrolls in. Still fine, just not free.
- **Cost:** +7 KB gzip for the library, more complex JSX, and you lose native
  in-page Ctrl+F for off-screen rows. Below ~100 items it's not worth it.
- Libraries: `@tanstack/react-virtual` (headless, this one), `react-virtuoso`
  (batteries included), `react-window` (old reliable, fixed sizes).

---

## Fix 5 — Web Worker (get CPU work off the main thread)

The "related posts" scoring runs over the whole corpus. Moved to a worker:

```js
// posts.js — one long-lived worker, reused
worker ??= new Worker(new URL('../lib/related.worker.js', import.meta.url),
                      { type: 'module' })
```
```js
// related.worker.js — imports the corpus directly, not via postMessage
import { POSTS } from '../data/seed'
import { scoreRelated } from './related'
self.onmessage = (e) => self.postMessage({ reqId: e.data.reqId,
                                           ids: scoreRelated(byId.get(e.data.id), POSTS) })
```

- Vite bundles the worker + its imports into a **separate chunk**, loaded on its
  own thread — never in the main bundle.
- **Pass ids, not data.** `postMessage` deep-clones its payload (structured
  clone); cloning 800 objects per call can cost more than the work saved. The
  worker importing the corpus itself sidesteps that. For genuinely large data,
  `ArrayBuffer` transfer (zero-copy) or `SharedArrayBuffer`.
- Keep **one** worker alive and multiplex requests with a `reqId` — spinning one
  up per call has real startup cost.

**The honest part:** `scoreRelated` over 800 posts is **~0.5 ms** unthrottled,
**~2.6 ms** on a mid-tier phone. That's *below* the bar where a worker pays for
itself — the message round-trip and the added complexity cost more than 2.6 ms.
It's kept here as the **pattern**. A worker actually earns its place when:

- the task is **> ~50 ms** on your target device (one dropped frame), and
- it runs in response to interaction or during a busy period, and
- it's mostly pure computation (parsing, diffing, search-index build, image
  processing, crypto, thousands of rows).

Cargo-culting workers for trivial work is the same mistake as `useMemo`-ing `a+b`.

---

## Brief / adjacent

- **Key stability** — `key={i}` (array index) on a reorderable/filterable list
  makes React reuse the wrong DOM nodes: lost input focus, wrong CSS transitions,
  stale state. Use a stable id (`key={post.id}`). Index keys are fine only for
  static, append-only lists.
- **Context re-renders** — every consumer of a context re-renders when *any* part
  of its value changes. Split contexts by update cadence (a stable-dispatch
  context vs a fast-changing-state context), or memoise the value object.
- **Layout thrashing** — a loop that writes a style then reads `offsetHeight`
  then writes again forces synchronous layout each iteration ("forced reflow",
  flagged in the Performance panel). Batch reads, then writes. Libraries like
  `useResizeObserver` help; `requestAnimationFrame` for visual updates.
- **CSS containment** — `contain: layout paint` on independent widgets scopes
  layout/paint recalculation so a change inside doesn't invalidate the page.
- **Animation** — animate `transform` / `opacity` (compositor-only, off the main
  thread). Animating `width`/`top`/`box-shadow` triggers layout or paint every
  frame. `will-change` hints the browser to promote a layer — use sparingly, it
  costs memory.
- **Memory leaks** — detached DOM nodes and un-cleared listeners/timers/
  subscriptions in `useEffect` (always return a cleanup). DevTools → Memory →
  heap snapshot, filter "Detached". Symptom: the tab gets slower the longer it's
  open.
- **`marked.parse()` in render (Q8/Q11)** — measured ~1 ms for our ~500-word
  bodies, so it stays inline. At article length (10k+ words, or syntax
  highlighting) it'd move to `useMemo`, then a worker, then parse-at-build-time.
  The escalation ladder, not a reflex.

---

## Measured — end to end

| | 01 | 03 | 04 baseline | 04 final |
|---|---|---|---|---|
| Feed mobile score | 53 | 88 | 67 | **90** |
| Feed TBT | — | 0 | 890 ms | **0 ms** |
| Feed DOM nodes | ~250 | ~250 | 14,244 | **143** |
| Keystroke latency | — | — | ~100 ms | **~2 ms** (input) |
| Post mobile score | ~53 | 98 | — | **88** |
| Post TBT (nav + Markdown + related) | — | — | — | **~10 ms** |

The 800-post feature now costs essentially nothing at load, types instantly, and
returns *better* (ranked) related posts — off the main thread.

---

## Next questions this raises

**Q14 — `useDeferredValue` makes the stale render interruptible, but it still
happens.** On a very large result set, is the deferred re-render itself a long
task, and does virtualization + `startTransition` on the filter fully cover it,
or do we need to debounce the *input* as well? Where's the line between
"concurrent React" and "just debounce it"? → revisit if it bites; likely fine.

**Q15 — The worker imports `POSTS` from the seed.** In a real app the corpus
comes from the network and changes. How do worker + main thread share a
cache/query layer without cloning everything on every message, and does the data
layer (React Query / SWR) have a worker story? → **topic 06**.

**Q16 — Everything measured so far is lab + a fast local network.** INP in
particular *cannot* be measured properly in the lab. What does it take to see
real LCP/INP/CLS from actual visitors — the `web-vitals` library, attribution,
an endpoint, a dashboard — and what dimensions make it actionable? → **topic 08**.

**Q17 — We now ship 3 route chunks + a vendor bundle + a worker chunk.** Is the
chunk graph sane, are we invalidating the framework cache on every app deploy,
and how do we put a budget on all this in CI so topic 04's 14k-DOM regression
gets caught automatically next time? → **topic 07**.
