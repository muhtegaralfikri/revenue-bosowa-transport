// /frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
// 1. Impor halaman Login
import LoginView from '../views/LoginView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    // 2. Tambahkan route baru
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
});

export default router;