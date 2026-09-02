import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    // Inline the two small guru portraits as base64 so `npm run build` can
    // still produce a single self-contained bundle when needed.
    assetsInlineLimit: 300000,
  },
})
