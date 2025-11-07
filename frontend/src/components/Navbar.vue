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

:deep(.nav-menu) {
  background: transparent;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
}

:deep(.p-menubar) {
  border-radius: 0;
  border: none;
  padding: 0;
  background: transparent;
  color: inherit;
}

:deep(.p-menubar-button) {
  color: #fff;
}

:deep(.p-menubar-root-list) {
  display: flex;
  gap: 1.25rem;
}

:deep(.p-menubar.p-menubar-mobile-active .p-menubar-root-list) {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  flex-direction: column;
  gap: 0;
  background: #ffffff;
  padding: 0.5rem 0;
  border-radius: 0.75rem;
  box-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.45);
  min-width: 180px;
  z-index: 50;
}

:deep(.p-menubar.p-menubar-mobile-active .p-menuitem-link) {
  padding: 0.75rem 1rem;
  color: #1e468c !important;
}

:deep(.p-menubar .p-menuitem-link) {
  color: #ffffff !important;
  font-weight: 600;
  letter-spacing: 0.01em;
}

:deep(.p-menubar .p-menuitem-text) {
  color: inherit !important;
}

:deep(.p-menubar .p-menuitem-link:hover) {
  background: rgba(255, 255, 255, 0.1);
}

:deep(.p-menubar .p-button) {
  color: #fff;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

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
