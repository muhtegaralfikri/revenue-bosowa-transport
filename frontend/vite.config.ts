// /frontend/vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 1. Impor modul 'path'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 2. Tambahkan blok 'resolve' ini
  resolve: {
    alias: {
      // Ini memberi tahu Vite bahwa '@' adalah alias untuk './src'
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    emptyOutDir: false,
    // Code splitting untuk optimasi bundle
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - library eksternal
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-primevue': ['primevue', '@primeuix/themes'],
          'vendor-chart': ['chart.js'],
        },
      },
    },
    // Naikkan limit warning agar tidak terlalu banyak warning
    chunkSizeWarningLimit: 600,
  },
})
