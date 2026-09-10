// Seed data for the Devlog app. Cover images come from picsum.photos (remote,
// intentionally served without width/height — a CLS lesson for later topics).
const AUTHORS = [
  { id: 'u1', name: 'Ada Powell', avatar: 'https://i.pravatar.cc/80?img=1' },
  { id: 'u2', name: 'Kwame Boateng', avatar: 'https://i.pravatar.cc/80?img=12' },
  { id: 'u3', name: 'Mira Chen', avatar: 'https://i.pravatar.cc/80?img=32' },
  { id: 'u4', name: 'Tomas Reyes', avatar: 'https://i.pravatar.cc/80?img=48' },
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
  'Why our tests were lying to us',
  'Postmortem: the config flag heard round the world',
  'Notes on interviewing after ten years',
]

const PARA =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

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

export const POSTS = TITLES.map((title, i) => {
  const author = AUTHORS[i % AUTHORS.length]
  return {
    id: String(i + 1),
    title,
    author,
    publishedAt: new Date(2026, 7, 28 - i, 9, 0, 0).toISOString(),
    cover: `https://picsum.photos/seed/devlog-${i + 1}/1200/630`,
    excerpt: PARA.slice(0, 140) + '…',
    body: MD_BODY,
    tags: ['engineering', i % 2 ? 'frontend' : 'infra', i % 3 ? 'story' : 'howto'],
    likes: 3 + ((i * 7) % 40),
  }
})

export const COMMENTS = POSTS.reduce((acc, post) => {
  acc[post.id] = Array.from({ length: (Number(post.id) % 4) + 1 }, (_, j) => ({
    id: `${post.id}-c${j + 1}`,
    author: AUTHORS[(Number(post.id) + j) % AUTHORS.length],
    createdAt: new Date(2026, 7, 28 - Number(post.id), 12 + j, 15).toISOString(),
    text: PARA.slice(0, 90 + j * 20),
  }))
  return acc
}, {})
