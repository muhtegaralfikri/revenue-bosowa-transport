<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAuthStore } from './stores/auth.store';
import Toast from 'primevue/toast';

const authStore = useAuthStore();
const currentYear = new Date().getFullYear();

onMounted(() => {
  authStore.checkAuth();
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
