# 06 — Network layer & data fetching

Resolves **Q7** (the split-chunk load waterfall) and **Q12** (a real client
cache instead of the hand-rolled `peekPost`).

| | branch |
|---|---|
| Real pagination, cache, prefetch, optimistic UI | `topic/06-network-data` (off `topic/05`) |

---

## Over-fetching → real pagination

The feed fetched all 800 posts on load — fine for client-side search (topic
04), wasteful for plain browsing. `getPostsPage(pageParam)` now returns 40 at a
time; the feed only pulls the full list when a search/filter/sort is active.

## Infinite scroll — `IntersectionObserver`, not a scroll listener

```js
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) fetchNextPage()
}, { rootMargin: '800px' })
observer.observe(sentinelEl)
```

A sentinel `<div>` after the list; `rootMargin: 800px` starts loading the next
page before the sentinel is actually on screen, so scrolling rarely outpaces
it. Verified: initial load shows 40 posts; scrolling to the bottom loads page
2 (40 → 80).

**Pagination, infinite scroll, and virtualization aren't alternatives — they
compose.** Pagination controls how much is *fetched*; virtualization (topic
04) controls how much is *rendered*; infinite scroll is just the UX pattern
that fetches the next page automatically instead of behind a button. This app
uses all three at once.

## A real client cache — React Query replaces `peekPost`

Topic 03's hand-rolled cache is gone. List queries now **prime** the
individual-post cache (`queryClient.setQueryData`) so opening a post shows its
title/cover instantly. The one piece of care needed: priming has to mark
itself `updatedAt: 0` (already stale) so a first-time open still fetches the
missing `body` — but must *skip* any post that's already fully loaded, or
every feed re-render would silently discard a real cache hit. Net effect: a
never-opened post shows a title instantly + fetches the body; a **revisited**
post (opened once already) shows fully instantly, no refetch.

## Prefetch on hover

```jsx
<article onMouseEnter={prefetch} onFocus={prefetch}>
```
`prefetch` calls `queryClient.prefetchQuery` for that post. Measured: a cold
click takes **~501 ms** to show the body; hovering ~700 ms before clicking
(enough for the prefetch to resolve) drops that to **~12 ms**. `onFocus` gets
the same win for keyboard/touch users, who can't hover.

## Optimistic UI

The like button updates the count in `onMutate` — before the request
resolves — and rolls back in `onError` if it fails. Measured: `38 → 39`
**3 ms** after clicking, ~500 ms before the (simulated) request actually
completes.

## The cache library isn't free

React Query added **~7 KB gzip** to the main chunk — loaded on every route,
so it's on the critical path. Lighthouse mobile went from ~88-90 to ~82-85;
the LCP breakdown attributes most of the added time to "Load Delay" (time
before the browser even requests the LCP image), consistent with more render
work happening — cache priming, query observers — before that image mounts,
amplified by mobile CPU throttling. A real trade: less hand-rolled cache code,
measurably more bytes and render work on every page.

---

## Brief / adjacent

- **N+1 requests** — many small requests where one batched request would do
  (e.g. fetching each comment's author separately). Doesn't occur in this
  app's shape; worth knowing the name for API design elsewhere.
- **Waterfall reading** — DevTools Network panel, waterfall view: look for
  requests that *could* start in parallel but are chained sequentially
  instead (each waiting on the previous one's response before firing).
- **`fetch()` priority** — `fetch(url, { priority: 'high' | 'low' })` is the
  non-image version of topic 03's `fetchpriority` attribute; same idea, for
  data requests instead of images.

---

## Next questions this raises

**Q21 — The bundle-cost finding above is a measurement, not a fix.** Is there
a smaller cache library worth the trade for an app this size, or is the
convenience worth 7 KB regardless? → a real decision, not explored further
here.

**Q22 — Optimistic UI was shown on a single counter (easy to roll back).**
What does it look like for something structural — an optimistically-inserted
comment that then fails and has to be removed from a list the user has
already scrolled past? Not deep-diving it, but the failure mode is harder
than a number ticking back down.

**Q23 — Everything measured in this whole curriculum so far is lab-only.**
Real caching, prefetching, and pagination behavior depends on real user
connection speed and real navigation patterns. → **topic 08**, directly.
