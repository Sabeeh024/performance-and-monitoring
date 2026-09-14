import { PostCard } from '@/components/PostCard'
import { getPosts } from '@/lib/data'

// No revalidate/dynamic export, no request-time API used (cookies/headers/
// searchParams) - this makes the route eligible for SSG: Next renders it
// once at `next build` and serves the resulting HTML to every visitor,
// identically, until the next build. `getPosts()`'s 300ms latency happens
// once, at build time - not per visitor. Confirmed in the build output
// (`○ (Static)` next to `/`).
export default async function FeedPage() {
  const posts = await getPosts()

  return (
    <div className="feed">
      <span className="badge">SSG — static, built once</span>
      <h1>Latest posts</h1>
      <div className="feed__grid">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} priority={i === 0} />
        ))}
      </div>
    </div>
  )
}
