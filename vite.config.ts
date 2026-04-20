import { defineConfig, loadEnv  } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars based on the current mode (dev, prod, etc.)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true, // so you can test on LAN if needed
    },
    define: {
      __API_BASE__: JSON.stringify(env.VITE_API_BASE || 'http://127.0.0.1:8080'),
      __WS_BASE__: JSON.stringify(env.VITE_WS_BASE || 'ws://127.0.0.1:8080')
    }
  }
})