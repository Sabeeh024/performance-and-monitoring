import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  // Source maps kept on for bundle analysis (source-map-explorer) and for
  // readable production stack traces. They ship as separate .map files that
  // browsers only fetch when devtools are open.
  build: {
    sourcemap: true,
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
