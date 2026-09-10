import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  // Source maps kept on for bundle analysis (source-map-explorer) and for
  // readable production stack traces. They ship as separate .map files that
  // browsers only fetch when devtools are open.
  build: { sourcemap: true },
  plugins: [
    react(),
    // Writes dist/stats.html on every build — a treemap of what's in each chunk.
    // gzipSize makes the numbers match what the browser actually downloads.
    visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
    visualizer({ filename: 'dist/stats.json', template: 'raw-data', gzipSize: true }),
  ],
})
