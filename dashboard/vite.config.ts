import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/dashboard/',
  build: {
    outDir: '../backend/public/dashboard',
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/v1': 'http://localhost:4000',
    },
  },
})
