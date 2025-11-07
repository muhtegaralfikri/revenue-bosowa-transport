<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

// Impor komponen PrimeVUE
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';

const router = useRouter();

// Definisikan item menu.
// 'Beranda' akan mengarah ke path '/'
const menuItems = ref([
  {
    label: 'Beranda',
    icon: 'pi pi-fw pi-home',
    command: () => {
      router.push('/'); // Navigasi ke Halaman Beranda
    },
  },
  // Nanti kita bisa tambahkan menu lain di sini
  // {
  //   label: 'Dashboard',
  //   icon: 'pi pi-fw pi-user',
  //   command: () => {
  //     router.push('/dashboard');
  //   },
  // },
]);

// Fungsi untuk tombol Login
// Fungsi untuk tombol Login
const goToLogin = () => {
  // Ganti 'alert' dengan ini:
  router.push('/login');
};
</script>

<template>
  <Menubar :model="menuItems">
    <template #start>
      <div class="flex align-items-center mr-4">
        <span class="font-bold text-lg">BOSOWA FUEL</span>
      </div>
    </template>

    <template #end>
      <Button
        label="Log In"
        icon="pi pi-sign-in"
        class="p-button-text p-button-sm"
        @click="goToLogin"
      />
    </template>
  </Menubar>
</template>

<style scoped>
/* Sedikit penyesuaian agar rapi */
.p-menubar {
  border-radius: 0;
  border-bottom: 1px solid var(--surface-d);
  padding: 0.5rem 1.5rem; /* Beri padding horizontal */
}

/* Penyesuaian untuk slot 'start' */
:deep(.p-menubar-start) {
  margin-right: auto; /* Mendorong menu item ke kanan */
}
</style>