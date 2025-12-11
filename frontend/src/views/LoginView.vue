<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

// Impor komponen PrimeVUE
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Card from 'primevue/card';
import Divider from 'primevue/divider';

const authStore = useAuthStore();

// State (ini tidak berubah)
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const handleLogin = async () => {
  loading.value = true;
  error.value = null;
  try {
    await authStore.login(email.value, password.value);
  } catch (err: any) {
    error.value = err.message || 'Terjadi kesalahan saat login.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <section class="auth-page">
    <div class="auth-page__inner">
      <div class="auth-page__hero">
        <p class="eyebrow">Revenue Monitoring System</p>
        <h1>Pantau realisasi pendapatan secara real-time.</h1>
        <p class="subtitle">
          Platform terintegrasi untuk monitoring target & realisasi pendapatan 
          Bosowa Bandar Group. Data akurat, laporan lengkap.
        </p>

        <ul class="hero-stats">
          <li>
            <span class="stat-label">3</span>
            <p>Perusahaan dalam satu dashboard terpadu.</p>
          </li>
          <li>
            <span class="stat-label">24/7</span>
            <p>Pemantauan target & realisasi harian.</p>
          </li>
          <li>
            <span class="stat-label">Trend</span>
            <p>Analisis tren pendapatan bulanan.</p>
          </li>
        </ul>
      </div>

      <Card class="auth-card">
        <template #title>
          <div>
            <p class="eyebrow mb-2">Masuk ke akun Anda</p>
            <h2 class="m-0">Login Sistem</h2>
          </div>
        </template>

        <template #content>
          <p class="text-color-secondary mb-4">
            Gunakan kredensial yang diberikan admin untuk mengakses dashboard.
          </p>

          <form @submit.prevent="handleLogin" class="form-grid">
            <div class="form-field">
              <label for="email">Email</label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="Masukkan email"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="password">Password</label>
              <Password
                id="password"
                v-model="password"
                placeholder="Masukkan password"
                :feedback="false"
                toggleMask
                class="w-full"
                inputClass="w-full"
              />
            </div>

            <Message
              v-if="error"
              severity="error"
              :closable="false"
              class="w-full"
            >
              {{ error }}
            </Message>

            <Button
              type="submit"
              label="Masuk"
              icon="pi pi-sign-in"
              class="w-full"
              :loading="loading"
            />
          </form>

          <Divider />

          <div class="help-text">
            <i class="pi pi-info-circle mr-2" />
            Perlu akses baru? Hubungi administrator Bosowa Bandar Group.
          </div>
        </template>
      </Card>
    </div>
  </section>
</template>

<style scoped>
/* 5. Style Kustom:
  Kita paksa container ini untuk mengambil sisa tinggi layar
  (100vh dikurangi tinggi navbar sekitar 60-65px).
*/
.auth-page {
  min-height: calc(100vh - 65px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.auth-page__inner {
  width: min(1100px, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  background: linear-gradient(135deg, #eef5ff 0%, #fdf7ff 100%);
  border-radius: 1.5rem;
  padding: 3rem;
  box-shadow: 0 25px 60px -35px rgba(15, 23, 42, 0.35);
}

.auth-page__hero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-card {
  border-radius: 1.25rem;
  box-shadow: 0 20px 40px -35px rgba(15, 23, 42, 0.45);
}

:deep(.auth-card .p-card-body) {
  padding: 2.5rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--surface-500);
}

h1 {
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1.2;
  margin: 0;
  color: var(--surface-900);
}

h2 {
  font-size: 1.75rem;
  color: var(--surface-900);
}

.subtitle {
  color: var(--surface-600);
  max-width: 36ch;
}

.hero-stats {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  padding: 0;
  margin: 1rem 0 0;
}

.hero-stats li {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 0.85rem;
  padding: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.stat-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--primary-color);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: var(--surface-700);
}

.help-text {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: var(--surface-600);
}

@media (max-width: 768px) {
  .auth-page__inner {
    padding: 2rem;
  }
}
</style>
