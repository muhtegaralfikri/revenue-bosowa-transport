// /frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
// Impor halaman baru kita
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView, // <-- Daftarkan di sini
    },
    // Nanti kita akan tambahkan halaman Login di sini
  ],
})

export default router