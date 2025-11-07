<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

// Impor komponen PrimeVUE
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message'; // Untuk notifikasi error

const authStore = useAuthStore();

// State untuk form
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const handleLogin = async () => {
  loading.value = true;
  error.value = null;
  try {
    await authStore.login(email.value, password.value);
    // Navigasi/redirect sudah di-handle di dalam authStore
  } catch (err: any) {
    error.value = err.message || 'Terjadi kesalahan saat login.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="grid justify-content-center p-4">
    <div class="col-12 md:col-6 lg:col-4">
      <div class="p-fluid">
        <h1>Login</h1>
        <p>Silakan masuk untuk melanjutkan.</p>

        <form @submit.prevent="handleLogin">
          <div class="field mt-4">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="admin@example.com"
            />
          </div>

          <div class="field mt-4">
            <label for="password">Password</label>
            <Password
              id="password"
              v-model="password"
              placeholder="Password"
              :feedback="false"
              toggleMask
            />
          </div>

          <Message v-if="error" severity="error" class="mt-3">{{
            error
          }}</Message>

          <Button
            type="submit"
            label="Log In"
            icon="pi pi-sign-in"
            class="mt-4 w-full"
            :loading="loading"
          />
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 {
  margin: 0;
}
.p-fluid .field {
  margin-bottom: 1rem;
}
</style>