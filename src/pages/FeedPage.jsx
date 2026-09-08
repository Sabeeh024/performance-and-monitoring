import { useEffect, useState } from 'react'
import { getPosts } from '../api/posts'
import { PostCard } from '../components/PostCard'
import { Spinner } from '../components/Spinner'

export function FeedPage() {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    let alive = true
    getPosts().then((data) => alive && setPosts(data))
    return () => {
      alive = false
    }
  }, [])

  if (!posts) return <Spinner label="Loading feed…" />

  return (
    <div className="feed">
      <h1 className="feed__heading">Latest posts</h1>
      <div className="feed__grid">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
