import { Route, Routes } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { FeedPage } from './pages/FeedPage'
import { PostPage } from './pages/PostPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <>
      <TopBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </>
  )
}
