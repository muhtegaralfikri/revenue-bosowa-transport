<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from 'primevue/button';

const router = useRouter();

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">Halaman Tidak Ditemukan</h2>
      <p class="error-message">Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
      <Button label="Kembali ke Beranda" icon="pi pi-home" @click="goHome" />
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 60px);
  padding: 2rem;
}

.not-found-content {
  text-align: center;
}

.error-code {
  font-size: 6rem;
  font-weight: 700;
  color: #1e468c;
  margin: 0;
  line-height: 1;
}

.error-title {
  font-size: 1.5rem;
  color: #374151;
  margin: 1rem 0 0.5rem;
}

.error-message {
  color: #6b7280;
  margin-bottom: 2rem;
}

@media (max-width: 576px) {
  .error-code {
    font-size: 4rem;
  }
  
  .error-title {
    font-size: 1.25rem;
  }
}
</style>
