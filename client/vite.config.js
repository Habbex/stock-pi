import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  envDir: resolve(__dirname, '../'),
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['preact', 'axios'],
          chart: ['lightweight-charts']
        }
      }
    }
  },
  server: {
    port: 4173,
    strictPort: true,
    host: true,
    origin: "http://0.0.0.0:4173",
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },
})
