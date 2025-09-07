// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/Z-Utilities/' : '/', // <-- base đúng repo
  plugins: [react()],
  server: {
    host: true, port: 5173,
    proxy: {
      '/api/lt': {
        target: 'https://libretranslate.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/lt/, ''),
      },
    },
  },
  resolve: { alias: { '@': '/src' } },
})
