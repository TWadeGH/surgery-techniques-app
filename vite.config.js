import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost', // Listen on localhost only
    port: 5176, // Use the same port you're already using
    strictPort: false, // Allow using next available port if 5176 is taken
    // Disable CSP headers in dev mode (Vite handles HMR which needs eval)
    headers: {}
  },
  // Disable CSP for development
  build: {
    rollupOptions: {
      output: {
        // Don't add CSP in production build either - let the server handle it
      }
    }
  }
})
