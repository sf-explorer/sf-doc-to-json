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
    },
    // Ensure proper MIME types for JSON files
    middlewareMode: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // Ensure JSON files are handled correctly
      output: {
        // Don't inline JSON files - keep them as separate chunks
        inlineDynamicImports: false,
        // Ensure JSON files are properly chunked
        manualChunks: undefined
      }
    },
    // Ensure JSON files are properly handled during build
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    exclude: [
      '@sf-explorer/salesforce-object-reference',
      '@sf-explorer/salesforce-agentforce-actions-reference'
    ],
    // Force Vite to not pre-bundle JSON files
    esbuildOptions: {
      loader: {
        '.json': 'json'
      }
    }
  },
  json: {
    // Use default export for JSON files (Vite's default behavior)
    namedExports: false,
    stringify: false
  },
  // Resolve JSON imports properly
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  }
})

