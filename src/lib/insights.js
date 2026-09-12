// Pure computation for the /insights page. Two of these are genuinely
// expensive at 800 posts (measured, not assumed) — that's deliberate: this
// file exists to give useDeferredValue/useTransition a real reason to be
// there, unlike the feed's tag/sort switch.

// Damerau-Levenshtein (optimal string alignment): edit distance with insert,
// delete, substitute, AND adjacent transposition as single-cost operations.
// Plain Levenshtein charges 2 for "design" -> "desing" (a transposed pair of
// letters — the single most common real typo); this charges 1, which is what
// makes the threshold below usable at all. O(a.length * b.length) per call,
// same complexity as plain Levenshtein, marginally more work per cell.
export function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1)
      }
    }
  }
  return dp[a.length][b.length]
}

// Typo-tolerant title search: best (lowest) edit distance between the query and
// any single word in each title. O(posts * words * levenshtein) — unlike the
// feed's plain `.includes()` search, this one is measurably expensive: ~4 ms
// unthrottled over 800 posts (~15-25 ms on a throttled/mobile CPU) with the
// length pre-filter below; it was ~20 ms before that filter existed, which is
// its own small lesson — fixing a correctness bug (see fuzzyTitleSearch) also
// cut the real work by ~5x, because most title words are far shorter than the
// query and no longer reach the expensive DP call at all. Small compared to
// computeTrending below, but still real and worth keeping off the input's own
// render — the justification for useDeferredValue on this page.
export function fuzzyTitleSearch(posts, query, { limit = 24 } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  // Scale the tolerance to the query, not a flat number: a flat maxDistance:3
  // lets a 6-letter word match almost anything (half its letters could differ).
  // One-quarter of the query length ("desing" -> 2, "the" -> 1) approves real
  // typos (transpositions, one dropped/doubled letter) without matching
  // unrelated words of similar length.
  const maxDistance = Math.max(1, Math.ceil(q.length / 4))
  const scored = []
  for (const post of posts) {
    let best = Infinity
    for (const word of post.title.toLowerCase().split(' ')) {
      // Cheap reject before paying for the DP table: two strings whose length
      // differs by more than maxDistance can't possibly be within it.
      if (Math.abs(word.length - q.length) > maxDistance) continue
      const d = levenshtein(q, word)
      if (d < best) best = d
      if (best === 0) break
    }
    if (best <= maxDistance) scored.push({ post, distance: best })
  }
  scored.sort((a, b) => a.distance - b.distance)
  return scored.slice(0, limit).map((s) => s.post)
}

// Cheap: one pass, just counting. Used for the Overview chart.
export function computeTagStats(posts) {
  const counts = new Map()
  for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

// "Trending" = ranked by how many OTHER posts share >=2 tags with it, i.e. how
// well-connected each post is to the rest of the corpus, plus raw likes. This
// needs an all-pairs comparison — O(n^2) — genuinely expensive: ~20 ms
// unthrottled over 800 posts, computed the moment the Trending tab is opened.
// That's what useTransition (in InsightsPage) covers: without it, opening the
// tab is a single ~20-80 ms synchronous render — a dropped frame.
export function computeTrending(posts, limit = 10) {
  const scored = posts.map((post) => {
    let clusterSize = 0
    for (const other of posts) {
      if (other === post) continue
      let shared = 0
      for (const t of other.tags) if (post.tags.includes(t)) shared++
      if (shared >= 2) clusterSize++
    }
    return { post, score: clusterSize * 2 + post.likes }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
