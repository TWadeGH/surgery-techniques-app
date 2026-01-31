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
  // Production build settings
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps for smaller build size
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js']
        }
      }
    }
  }
})
