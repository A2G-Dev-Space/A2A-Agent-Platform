import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(),react()],
  server: {
    port: 9060,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9050',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:9050',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
