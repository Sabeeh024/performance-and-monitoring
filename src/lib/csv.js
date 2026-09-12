import { marked } from 'marked'

// Yield the main thread back to the browser for one turn — long enough for a
// pending input, click, or paint to get processed before we resume. `scheduler
// .yield()` (Chrome 129+) is purpose-built for this and resumes with normal
// priority; `setTimeout(fn, 0)` is the fallback everywhere else — cruder (it
// queues behind other macrotasks, not guaranteed minimal delay) but the same
// shape.
export const yieldToMain =
  typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function'
    ? () => scheduler.yield()
    : () => new Promise((resolve) => setTimeout(resolve, 0))

function escapeCsv(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Real per-row cost, not padding: turn each post's Markdown body into a plain-
// text preview for the export, the same way an "export with content preview"
// feature would in a real app.
function toRow(post) {
  const html = marked.parse(post.body)
  const preview = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)
  return [post.id, post.title, post.author.name, post.tags.join('|'), post.likes, preview]
    .map(escapeCsv)
    .join(',')
}

const HEADER = 'id,title,author,tags,likes,preview'

// The naive version: one synchronous pass, ~50 ms/800 posts unthrottled. Fine
// on a fast desktop; a genuinely long task on a throttled/low-end device, and
// it blocks *everything* — clicks, typing, paint — for its entire duration.
export function buildCsvSync(posts) {
  return [HEADER, ...posts.map(toRow)].join('\n')
}

// The chunked version: same total work, cut into pieces with a yield between
// each one. Nothing here makes the work itself faster — total time is roughly
// the same or slightly higher (the yields aren't free) — but every yield is a
// chance for the browser to handle a click, a keystroke, or a frame before we
// take the thread back.
export async function buildCsvChunked(posts, { chunkSize = 50, onProgress } = {}) {
  const rows = [HEADER]
  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize)
    for (const post of chunk) rows.push(toRow(post))
    onProgress?.(Math.min(100, Math.round(((i + chunk.length) / posts.length) * 100)))
    await yieldToMain()
  }
  return rows.join('\n')
}
