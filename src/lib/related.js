// Pure scoring function, shared by the main thread and the worker.
// Similarity = tag Jaccard + title-token overlap. O(n) over all posts, with
// tokenisation per post — a few ms for ~800 posts, more as the corpus grows.
const tokenize = (s) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)

export function scoreRelated(target, posts, limit = 3) {
  const targetTags = new Set(target.tags)
  const targetWords = new Set(tokenize(target.title))

  const scored = []
  for (const p of posts) {
    if (p.id === target.id) continue
    const pTags = p.tags
    let shared = 0
    for (const t of pTags) if (targetTags.has(t)) shared++
    const tagScore = shared / (targetTags.size + pTags.length - shared || 1)

    const words = tokenize(p.title)
    let wordHits = 0
    for (const w of words) if (targetWords.has(w)) wordHits++
    const wordScore = wordHits / (targetWords.size || 1)

    const score = tagScore * 2 + wordScore
    if (score > 0) scored.push({ id: p.id, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.id)
}
