import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // For GitHub Pages project sites the app is served from /<repo>/ —
  // the deploy workflow sets VITE_BASE accordingly. Local dev stays "/".
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api/annotator': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/annotator/, ''),
      },
      '/api/converter': {
        target: 'http://127.0.0.1:5051',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/converter/, ''),
      },
      '/api/previewer': {
        target: 'http://127.0.0.1:5053',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/previewer/, ''),
      },
    },

  }
})
