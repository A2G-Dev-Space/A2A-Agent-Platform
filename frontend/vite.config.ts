import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '')

  // Use VITE_HOST_IP from .env, fallback to localhost
  const HOST_IP = env.VITE_HOST_IP || 'localhost'
  const GATEWAY_PORT = env.VITE_GATEWAY_PORT || '9050'
  const SSL_ENABLED = env.SSL_ENABLED === 'true' || false

  const protocol = SSL_ENABLED ? 'https' : 'http'
  const wsProtocol = SSL_ENABLED ? 'wss' : 'ws'

  console.log(`Vite proxy configured for: ${protocol}://${HOST_IP}:${GATEWAY_PORT}`)

  return {
    plugins: [tailwindcss(), react()],
    server: {
      port: 9060,
      host: '0.0.0.0',  // 모든 IP에서 접근 가능
      allowedHosts: 'all',  // 모든 호스트 허용 (DNS, IP 제한 없음)
      proxy: {
        '/api': {
          target: `${protocol}://${HOST_IP}:${GATEWAY_PORT}`,
          changeOrigin: true,
          secure: false,  // 자체 서명 인증서 허용
        },
        '/ws': {
          target: `${wsProtocol}://${HOST_IP}:${GATEWAY_PORT}`,
          ws: true,
          changeOrigin: true,
          secure: false,  // 자체 서명 인증서 허용
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
