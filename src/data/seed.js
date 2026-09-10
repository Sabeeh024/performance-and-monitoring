// Seed data for the Devlog app. ~800 procedurally generated posts so the feed is
// big enough for re-render / virtualization / long-task lessons (topic 04).
const AUTHORS = [
  { id: 'u1', name: 'Ada Powell', avatar: 'https://i.pravatar.cc/80?img=1' },
  { id: 'u2', name: 'Kwame Boateng', avatar: 'https://i.pravatar.cc/80?img=12' },
  { id: 'u3', name: 'Mira Chen', avatar: 'https://i.pravatar.cc/80?img=32' },
  { id: 'u4', name: 'Tomas Reyes', avatar: 'https://i.pravatar.cc/80?img=48' },
  { id: 'u5', name: 'Lena Vogt', avatar: 'https://i.pravatar.cc/80?img=20' },
  { id: 'u6', name: 'Priya Nair', avatar: 'https://i.pravatar.cc/80?img=45' },
]

const VERBS = [
  'Shipping', 'Rewriting', 'Debugging', 'Profiling', 'Migrating', 'Deleting',
  'Testing', 'Scaling', 'Caching', 'Refactoring', 'Benchmarking', 'Untangling',
]
const NOUNS = [
  'a design system', 'the build pipeline', 'our auth layer', 'a memory leak',
  'the render path', 'a flaky test suite', 'the API gateway', 'our CSS',
  'a state machine', 'the deploy script', 'a config flag', 'the search index',
]
const TAILS = [
  'without a team', 'in one weekend', 'six months in', 'the hard way',
  'and living to tell it', 'before the demo', 'on a Friday', 'twice',
]
const TAGS = [
  'engineering', 'frontend', 'backend', 'infra', 'story', 'howto', 'perf',
  'testing', 'career', 'tools', 'postmortem', 'css',
]

const PARA =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'

// Post bodies are Markdown, rendered on the post route only (marked + dompurify).
const MD_BODY = `## Background

${PARA}

Some key points:

- First, a thing that matters
- Second, a caveat about the thing
- Third, what we did instead

> A pull quote that sounds wiser than it is.

\`\`\`js
function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
\`\`\`

### What happened next

${PARA}

${PARA}`

// Small seeded PRNG so the data is identical on every reload.
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const rand = rng(42)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

const COUNT = 800

export const POSTS = Array.from({ length: COUNT }, (_, i) => {
  const n = i + 1
  const title = `${pick(VERBS)} ${pick(NOUNS)} ${pick(TAILS)}`
  const tagCount = 2 + Math.floor(rand() * 3)
  const tags = [...new Set(Array.from({ length: tagCount }, () => pick(TAGS)))]
  return {
    id: String(n),
    title,
    author: AUTHORS[i % AUTHORS.length],
    publishedAt: new Date(2026, 8, 1 - (i % 365), 9, 0, 0).toISOString(),
    coverSeed: `devlog-${(i % 60) + 1}`,
    excerpt: PARA.slice(0, 130) + '…',
    body: MD_BODY,
    tags,
    readingMinutes: 3 + (i % 9),
    likes: 3 + ((i * 7) % 40),
  }
})

export const ALL_TAGS = TAGS

export const COMMENTS = POSTS.reduce((acc, post) => {
  acc[post.id] = Array.from({ length: (Number(post.id) % 4) + 1 }, (_, j) => ({
    id: `${post.id}-c${j + 1}`,
    author: AUTHORS[(Number(post.id) + j) % AUTHORS.length],
    createdAt: new Date(2026, 7, 28 - (Number(post.id) % 28), 12 + j, 15).toISOString(),
    text: PARA.slice(0, 90 + j * 20),
  }))
  return acc
}, {})
