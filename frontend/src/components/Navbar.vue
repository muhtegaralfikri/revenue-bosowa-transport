<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import logoSrc from '@/assets/logo.png';
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';

const router = useRouter();
const authStore = useAuthStore();

// Definisikan item menu.
const menuItems = ref([
  {
    label: 'Beranda',
    command: () => {
      router.push('/');
    },
  },
  {
    label: 'Dashboard',
    command: () => {
      router.push('/admin-dashboard');
    },
    visible: () => authStore.isAdmin,
  },
  {
    label: 'Dashboard',
    command: () => {
      router.push('/ops-dashboard');
    },
    visible: () => authStore.isOperasional,
  },
]);

// Navigasi ke Halaman Login
const goToLogin = () => {
  router.push('/login');
};

// Panggil action logout dari store
const handleLogout = () => {
  authStore.logout();
};
</script>

<template>
  <header class="navbar-shell">
    <button class="brand" type="button" @click="router.push('/')">
      <img :src="logoSrc" alt="Bosowa Fuel" class="brand__logo" />
    </button>

    <div class="nav-group">
      <Menubar :model="menuItems" class="nav-menu" />

      <div class="nav-actions">
        <Button
          v-if="!authStore.isAuthenticated"
          label="Log In"
          icon="pi pi-sign-in"
          class="p-button-text p-button-sm"
          @click="goToLogin"
        />

        <Button
          v-else
          label="Log Out"
          icon="pi pi-sign-out"
          class="p-button-text p-button-sm p-button-danger"
          @click="handleLogout"
        />
      </div>
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

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Style untuk tombol Log In/Log Out kita biarkan di sini */
:deep(.nav-actions .p-button),
:deep(.nav-actions .p-button-label),
:deep(.nav-actions .p-button-icon) {
  color: #ffffff !important;
}

:deep(.nav-actions .p-button.p-button-text:hover) {
  background: #ffffff;
  color: #1e468c !important;
}

:deep(.nav-actions .p-button.p-button-text:hover .p-button-label),
:deep(.nav-actions .p-button.p-button-text:hover .p-button-icon) {
  color: #1e468c !important;
}
</style>