import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['trinhs-macbook-pro.local'],
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
