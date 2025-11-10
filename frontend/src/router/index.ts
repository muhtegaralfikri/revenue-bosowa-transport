// /frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store'; // <-- Impor store

import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';

// Impor halaman dashboard baru
import AdminDashboard from '../views/AdminDashboard.vue';
import OpsDashboard from '../views/OpDashboard.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    // Rute Admin (Dilindungi)
    {
      path: '/admin-dashboard',
      name: 'admin-dashboard',
      component: AdminDashboard,
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin'],
      },
    },
    // Rute Operasional (Dilindungi)
    {
      path: '/ops-dashboard',
      name: 'ops-dashboard',
      component: OpsDashboard,
      meta: {
        requiresAuth: true,
        allowedRoles: ['operasional'],
      },
    },
  ],
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // Pastikan state sinkron dengan localStorage sebelum guard jalan
  if (!authStore.user && authStore.token) {
    try {
      authStore.checkAuth();
    } catch (error) {
      // Token tidak valid, biarkan checkAuth meng-handle logout
    }
  }

  if (to.meta?.requiresAuth && !authStore.isAuthenticated) {
    next({
      name: 'login',
      query: { redirect: to.fullPath },
    });
    return;
  }

  const userRole = authStore.user?.role ?? null;
  if (to.meta?.allowedRoles && (!userRole || !to.meta.allowedRoles.includes(userRole))) {
    // Jika user sudah login tapi role tidak sesuai, arahkan ke dashboard sesuai role atau logout
    if (authStore.isAdmin) {
      next('/admin-dashboard');
    } else if (authStore.isOperasional) {
      next('/ops-dashboard');
    } else {
      authStore.logout();
      next({ name: 'login' });
    }
    return;
  }

  next();
});

export default router;
