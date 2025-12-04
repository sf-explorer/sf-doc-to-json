import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/sf-doc-to-json/' : '/',
  server: {
    port: 3000,
    fs: {
      // Allow serving files from the parent directory (for symlinked package)
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    exclude: ['@sf-explorer/salesforce-object-reference'],
    // Force Vite to not pre-bundle JSON files
    esbuildOptions: {
      loader: {
        '.json': 'json'
      }
    }
  },
  json: {
    // Use named exports for JSON files to avoid parsing issues
    namedExports: true,
    stringify: false
  }
})

