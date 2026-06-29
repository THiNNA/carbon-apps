import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // ขยาย warning limit เพราะ xlsx chunk เป็น lazy-loaded ไม่กระทบ initial load
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // แยก vendor libraries ออกเพื่อให้ browser cache ได้ดีขึ้น
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react/')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
          }
        }
      }
    }
  }
})
