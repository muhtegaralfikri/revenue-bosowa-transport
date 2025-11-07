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
})