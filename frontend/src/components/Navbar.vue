<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import logoSrc from '@/assets/logo.png';
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const menuItems = computed(() => {
  const items = [
    {
      label: 'Beranda',
      command: () => {
        router.push('/');
      },
    },
  ];

  if (authStore.isAdmin) {
    items.push(
      {
        label: 'Dashboard',
        command: () => {
          router.push('/dashboard/admin');
        },
      },
      {
        label: 'Kelola User',
        command: () => {
          router.push('/dashboard/admin/users');
        },
      },
    );
  }

  if (authStore.isOperasional) {
    items.push({
      label: 'Dashboard',
      command: () => {
        router.push('/dashboard/operasional');
      },
    });
  }

  items.push(
    authStore.isAuthenticated
      ? {
          label: 'Log Out',
          command: handleLogout,
        }
      : {
          label: 'Log In',
          command: goToLogin,
        },
  );

  return items;
});

const bottomNavItems = computed(() => {
  const items = [
    {
      label: 'Beranda',
      icon: 'pi pi-home',
      to: '/',
    },
  ];

  if (authStore.isAdmin) {
    items.push(
      {
        label: 'Dashboard',
        icon: 'pi pi-chart-bar',
        to: '/dashboard/admin',
      },
      {
        label: 'Kelola User',
        icon: 'pi pi-users',
        to: '/dashboard/admin/users',
      },
    );
  } else if (authStore.isOperasional) {
    items.push({
      label: 'Dashboard',
      icon: 'pi pi-chart-line',
      to: '/dashboard/operasional',
    });
  }

  return items;
});

const activePath = computed(() => route.path);

// Navigasi ke Halaman Login
const goToLogin = () => {
  router.push('/login');
};

// Panggil action logout dari store
const handleLogout = async () => {
  await authStore.logout();
};
</script>

<template>
<header class="navbar-shell">
  <button class="brand" type="button" @click="router.push('/')">
    <img :src="logoSrc" alt="Bosowa Fuel" class="brand__logo" />
  </button>

  <div class="nav-group desktop-nav">
    <Menubar :model="menuItems" class="nav-menu" />
  </div>

  <div class="mobile-auth">
    <Button
      v-if="authStore.isAuthenticated"
      label="Log Out"
      size="small"
      severity="secondary"
      @click="handleLogout"
    />
    <Button
      v-else
      label="Log In"
      size="small"
      severity="secondary"
      @click="goToLogin"
    />
  </div>
</header>

<nav class="bottom-nav" aria-label="Navigasi bawah">
  <button
    v-for="item in bottomNavItems"
    :key="item.to"
    type="button"
    class="bottom-nav__item"
    :class="{ active: activePath === item.to || activePath.startsWith(item.to + '/') }"
    @click="router.push(item.to)"
  >
    <i :class="['pi', item.icon.replace('pi ', '')]" aria-hidden="true" />
    <span>{{ item.label }}</span>
  </button>
</nav>
</template>

<style scoped>
/*
  PERHATIKAN:
  Semua style :deep() untuk .p-menubar, .p-menuitem-link, dan .p-menuitem-text
  telah DIHAPUS dari sini dan dipindahkan ke 'style.css' global.
*/

:global(body) {
  margin: 0;
}

.navbar-shell {
  background: #1e468c;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2.75rem;
  height: 60px;
}

.brand {
  display: flex;
  align-items: center;
  margin-right: 1rem;
  height: 40px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.brand__logo {
  height: 100%;
  width: auto;
  object-fit: contain;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
}

.mobile-auth {
  display: none;
  align-items: center;
  gap: 0.5rem;
}

.bottom-nav {
  display: none;
}

.bottom-nav__item {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.65rem 0.5rem 0.35rem;
  background: none;
  border: none;
  color: #e5e7eb;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}

.bottom-nav__item i {
  font-size: 1.1rem;
}

.bottom-nav__item.active {
  color: #ffffff;
  transform: translateY(-2px);
}

.bottom-nav__item:not(.active):hover {
  color: #ffffff;
}

@media (max-width: 768px) {
  .navbar-shell {
    padding: 0 1rem;
  }

  .desktop-nav {
    display: none;
  }

  .mobile-auth {
    display: flex;
  }

  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 64px;
    background: #1e468c;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 -10px 25px -25px rgba(0, 0, 0, 0.25);
    z-index: 1500;
    padding: 0.25rem 0.35rem env(safe-area-inset-bottom, 0);
  }

  :global(.app-main) {
    padding-bottom: 84px;
  }
}

</style>
