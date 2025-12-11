import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

// Eager load - halaman utama
import HomeView from '../views/HomeView.vue';

// Lazy load - halaman lain di-load saat dibutuhkan
const LoginView = () => import('../views/LoginView.vue');
const UserManagementView = () => import('../views/UserManagementView.vue');
const InputRevenueView = () => import('../views/InputRevenueView.vue');
const NotFoundView = () => import('../views/NotFoundView.vue');

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
    {
      path: '/input',
      name: 'input',
      component: InputRevenueView,
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'users',
      component: UserManagementView,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.user && authStore.token) {
    try {
      authStore.checkAuth();
    } catch (error) {
      // Token tidak valid
    }
  }

  if (to.meta?.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  next();
});

export default router;
