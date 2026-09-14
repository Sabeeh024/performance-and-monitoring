// Same idea as the Vite app's seed.js, deliberately smaller — this demo is
// about rendering strategy, not scale (topic 04 already covered scale).
// Server-only latency simulation: no client ever imports this file directly.

const AUTHORS = [
  { id: 'u1', name: 'Ada Powell', avatar: 'https://i.pravatar.cc/80?img=1' },
  { id: 'u2', name: 'Kwame Boateng', avatar: 'https://i.pravatar.cc/80?img=12' },
  { id: 'u3', name: 'Mira Chen', avatar: 'https://i.pravatar.cc/80?img=32' },
]

const TITLES = [
  'Shipping a design system without a team',
  'What I learned rewriting our build in Vite',
  'The bug that only happened on Tuesdays',
  'Reading flame graphs without fear',
  'Our migration off a monolith, six months in',
  'Type-safe forms are still hard',
  'A love letter to boring technology',
  'How we cut our Docker image in half',
  'Debugging a memory leak in production',
  'The case against premature abstraction',
  'Writing a language server in a weekend',
  'Caching is the only hard problem',
]

const PARA =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'

const MD_BODY = (title) => `## Background

${PARA}

Some key points about "${title}":

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

${PARA}`

const POSTS = TITLES.map((title, i) => ({
  id: String(i + 1),
  title,
  author: AUTHORS[i % AUTHORS.length],
  publishedAt: new Date(2026, 8, 14 - i).toISOString(),
  coverSeed: `devlog-${i + 1}`,
  excerpt: PARA.slice(0, 130) + '…',
  body: MD_BODY(title),
  tags: ['engineering', i % 2 ? 'frontend' : 'infra'],
  readingMinutes: 3 + (i % 6),
  likes: 3 + ((i * 7) % 40),
}))

const COMMENTS = POSTS.reduce((acc, post) => {
  acc[post.id] = Array.from({ length: (Number(post.id) % 3) + 1 }, (_, j) => ({
    id: `${post.id}-c${j + 1}`,
    author: AUTHORS[(Number(post.id) + j) % AUTHORS.length],
    createdAt: new Date(2026, 8, 13 - j).toISOString(),
    text: PARA.slice(0, 90 + j * 20),
  }))
  return acc
}, {})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// A network-ish delay on every "fetch" - same reason as the Vite app's
// fakeGet: without it, everything is instant and every rendering strategy
// looks identical.
const LATENCY = 300

export async function getPosts() {
  await wait(LATENCY)
  return POSTS.map(({ body, ...rest }) => rest)
}

export async function getPost(id) {
  await wait(LATENCY)
  return POSTS.find((p) => p.id === id) ?? null
}

export async function getComments(postId) {
  await wait(LATENCY)
  return COMMENTS[postId] ?? []
}

export async function addComment(postId, { author, text }) {
  await wait(LATENCY)
  const comment = { id: `${postId}-c${Date.now()}`, author, createdAt: new Date().toISOString(), text }
  COMMENTS[postId] = [...(COMMENTS[postId] ?? []), comment]
  return comment
}

export async function likePost(id) {
  await wait(LATENCY)
  const post = POSTS.find((p) => p.id === id)
  if (post) post.likes += 1
  return post?.likes
}

export function getAllPostIds() {
  return POSTS.map((p) => p.id)
}
