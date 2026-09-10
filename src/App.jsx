import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { Spinner } from './components/Spinner'

// Route-level code splitting. Each page becomes its own chunk, fetched only when
// the route is visited. `.then(m => ({ default: ... }))` adapts our named exports
// to what React.lazy wants (a module with a `default`).
const FeedPage = lazy(() =>
  import('./pages/FeedPage').then((m) => ({ default: m.FeedPage })),
)
const PostPage = lazy(() =>
  import('./pages/PostPage').then((m) => ({ default: m.PostPage })),
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)

export default function App() {
  return (
    <>
      <TopBar />
      <main className="container">
        <Suspense fallback={<Spinner label="Loading…" />}>
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}
