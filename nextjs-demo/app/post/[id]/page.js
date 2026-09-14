import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { getAllPostIds, getPost } from '@/lib/data'
import { Avatar } from '@/components/Avatar'
import { LikeButton } from '@/components/LikeButton'
import { CommentsSection } from '@/components/CommentsSection'

// ISR: this page is static like the feed, but with an expiry. Next serves the
// cached HTML instantly, and at most once per 60s, the *next* visitor after
// that window triggers a background re-render that replaces the cache for
// everyone after - nobody ever waits on it live. Compare to the Vite SPA,
// where "fresh data" meant a client fetch on every visit (topic 06) or
// nothing at all (topic 03's static-until-reload feed).
export const revalidate = 60

// Pre-render every known post at build time; a post created after the build
// still works (falls back to on-demand SSR for that one id, then gets its
// own ISR cache entry) - the default `dynamicParams: true`.
export async function generateStaticParams() {
  return getAllPostIds().map((id) => ({ id }))
}

const SIZES = '(max-width: 900px) 100vw, 868px'

export default async function PostPage({ params }) {
  const { id } = await params
  const post = await getPost(id)
  if (!post) notFound()

  // marked + DOMPurify run here, on the server, in a component with no 'use
  // client' - this HTML is the only thing that reaches the browser. The Vite
  // SPA shipped marked+dompurify as a ~24 KB gzip client chunk (topic 02) so
  // the browser could do this same work; a Server Component never ships the
  // library at all, to any visitor, ever.
  const html = DOMPurify.sanitize(marked.parse(post.body))

  return (
    <article className="post">
      <span className="badge">ISR — revalidates every 60s</span>
      <div className="post__cover-wrap">
        <Image
          src={`https://picsum.photos/seed/${post.coverSeed}/1200/630`}
          alt=""
          fill
          sizes={SIZES}
          style={{ objectFit: 'cover' }}
          priority
        />
      </div>
      <h1 className="post__title">{post.title}</h1>
      <div className="post__meta">
        <Avatar user={post.author} size={32} />
        <span>{post.author.name}</span>
        <span>·</span>
        <time dateTime={post.publishedAt}>
          {new Date(post.publishedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
      </div>

      <LikeButton postId={post.id} initialLikes={post.likes} />

      <div className="post__body" dangerouslySetInnerHTML={{ __html: html }} />

      {/* Suspense boundary = the streaming point. The article above ships as
          soon as it's ready; this fetches independently and streams in when
          its 300ms is up, over the same response - no separate client
          request the way the SPA's lazy CommentsSection chunk needed one. */}
      <Suspense fallback={<p className="spinner">Loading comments…</p>}>
        <CommentsSection postId={post.id} />
      </Suspense>
    </article>
  )
}
