import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  build: {
    // 'hidden': .map files are still generated (source-map-explorer, and an
    // error tool like Sentry can still ingest them from the build output) but
    // the shipped JS has no `//# sourceMappingURL=` comment pointing at them.
    // With `true`, that comment is what let any visitor's DevTools fetch the
    // map and browse fully-reconstructed original source — comments and all
    // (this is exactly the mechanism topic 02's bundle analysis relied on).
    // `false` drops maps entirely, including from your own tooling.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // Vendor code in its own chunk, separate from app glue (App.jsx, the
        // lazy() import() calls). Without this, editing ANY route — even a
        // lazily-loaded one — changes the entry chunk's hash too (the entry
        // embeds "./FeedPage-<hash>.js" as a literal string), forcing
        // everyone to re-download React/React-DOM/router/React Query on
        // every single deploy regardless of what actually changed.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/react-dom|\/react\/|react-router/.test(id)) return 'vendor-react'
          if (id.includes('@tanstack')) return 'vendor-query'
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    // Writes dist/stats.html on every build — a treemap of what's in each chunk.
    // gzipSize makes the numbers match what the browser actually downloads.
    visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
    visualizer({ filename: 'dist/stats.json', template: 'raw-data', gzipSize: true }),
  ],
})
