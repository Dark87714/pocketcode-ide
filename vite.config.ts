import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'ui-icons': ['lucide-react'],
          'storage-tools': ['idb-keyval', 'jszip'],
          'monaco-core': ['monaco-editor', '@monaco-editor/react']
        }
      }
    }
  }
})
