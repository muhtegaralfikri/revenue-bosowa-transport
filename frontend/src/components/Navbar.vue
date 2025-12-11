<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import logoSrc from '@/assets/logo.png';
import Menubar from 'primevue/menubar';

const router = useRouter();
const authStore = useAuthStore();

const menuItems = computed(() => {
  const items: any[] = [
    {
      label: 'Beranda',
      command: () => router.push('/'),
    },
  ];

  if (authStore.isAuthenticated) {
    items.push({
      label: 'Kelola User',
      command: () => router.push('/users'),
    });
    items.push({
      label: 'Log Out',
      command: () => authStore.logout(),
    });
  } else {
    items.push({
      label: 'Log In',
      command: () => router.push('/login'),
    });
  }

  return items;
});
</script>

<template>
  <header class="navbar-shell">
    <button class="brand" type="button" @click="router.push('/')">
      <img :src="logoSrc" alt="Bosowa Fuel" class="brand__logo" />
    </button>

    <div class="nav-group">
      <Menubar :model="menuItems" class="nav-menu" />
    </div>
  </header>
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

</style>
