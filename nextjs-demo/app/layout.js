import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { WebVitalsReporter } from './WebVitalsReporter'

// next/font/google downloads Inter at build time, self-hosts it (no request
// to fonts.googleapis.com at runtime - the topic 03 fix, automatic here),
// and generates a fallback @font-face with `size-adjust`/`ascent-override`
// tuned to match Inter's metrics - the "pick a metrically-compatible
// fallback stack" work from topic 03, done for you.
const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'Devlog (Next.js)',
  description: 'Rendering-strategies companion to the Vite SPA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <WebVitalsReporter />
        <header className="topbar">
          <Link href="/" className="topbar__brand">
            Devlog
          </Link>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
