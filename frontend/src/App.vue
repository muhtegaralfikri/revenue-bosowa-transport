<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAuthStore } from './stores/auth.store';
import { useStockStore } from './stores/stock.store';
import Toast from 'primevue/toast';

const authStore = useAuthStore();
const stockStore = useStockStore();
const currentYear = new Date().getFullYear();

onMounted(() => {
  authStore.checkAuth();
  stockStore.startPolling();
});

onBeforeUnmount(() => {
  stockStore.stopPolling();
});
</script>

<template>
  <div class="app-shell">
    <Toast />
    <Navbar />
    <main class="app-main">
      <div
        v-if="authStore.isAuthenticated && authStore.user"
        class="user-greeting"
      >
        Halo, <strong>{{ authStore.user.username }}</strong>
      </div>
      <RouterView />
    </main>
    <footer class="app-footer">
      © {{ currentYear }} Bosowa Bandar Group. All rights reserved.
    </footer>
  </div>
</template>
