import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

// Dynamic import, not a static one: RUM reporting isn't needed to render
// anything, so it shouldn't compete with the app for a spot in the entry
// chunk (topic 07's whole point, applied to this topic's own code) — this
// puts web-vitals/attribution in its own small chunk, fetched in parallel
// instead of adding ~5.6 KB gzip to the critical path.
import('./lib/vitals').then((m) => m.initWebVitals())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // don't re-fetch on every remount within 30s of a fresh fetch
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
