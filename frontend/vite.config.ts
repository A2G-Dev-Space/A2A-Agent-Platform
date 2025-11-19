import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(),react()],
  server: {
    port: 9060,
    host: '0.0.0.0',  // 모든 IP에서 접근 가능 (또는 특정 IP 입력 예: '192.168.1.100')
    proxy: {
      '/api': {
        target: 'http://localhost:9050',  // Backend IP로 변경 필요 시: 'http://192.168.1.100:9050'
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:9050',    // Backend IP로 변경 필요 시: 'ws://192.168.1.100:9050'
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
