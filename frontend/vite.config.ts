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
        target: 'http://172.26.110.192:9050',
        changeOrigin: true,
        secure: false,  // 프록시 검증 비활성화
      },
      '/ws': {
        target: 'ws://172.26.110.192:9050',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
