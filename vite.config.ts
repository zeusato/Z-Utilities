import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Z-Utilities/',  // bắt buộc khi deploy lên GH Pages repo này
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  
})
