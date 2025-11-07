<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAuthStore } from './stores/auth.store';
import { useStockStore } from './stores/stock.store';
import Toast from 'primevue/toast';

const authStore = useAuthStore();
const stockStore = useStockStore();

onMounted(() => {
  authStore.checkAuth();
  stockStore.startPolling();
});

onBeforeUnmount(() => {
  stockStore.stopPolling();
});
</script>

<template>
  <Toast />
  <Navbar />
  <RouterView />
</template>
