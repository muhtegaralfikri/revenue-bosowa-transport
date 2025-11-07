// /frontend/src/stores/auth.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/services/api'; // API client kita
import { jwtDecode } from 'jwt-decode'; // Library yang baru kita install

// Definisikan tipe data user dari payload token
interface UserPayload {
  id: string;
  username: string;
  role: 'admin' | 'operasional';
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();

  // --- STATE ---
  // Coba ambil token dari localStorage saat pertama kali load
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<UserPayload | null>(null);

  // --- GETTERS (Computed) ---
  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isOperasional = computed(() => user.value?.role === 'operasional');

  // --- ACTIONS ---

  /**
   * Fungsi untuk Login
   */
  async function login(email: string, password: string) {
    try {
      const response = await apiClient.post<{ access_token: string }>(
        '/auth/login',
        { email, password },
      );

      const accessToken = response.data.access_token;
      
      // 1. Simpan token di state & localStorage
      localStorage.setItem('token', accessToken);
      token.value = accessToken;

      // 2. Decode token untuk dapat data user
      const decoded = jwtDecode<UserPayload>(accessToken);
      user.value = decoded;

      // 3. Set header default Axios untuk request berikutnya
      apiClient.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${accessToken}`;

      // 4. Redirect ke halaman yang sesuai
      if (decoded.role === 'admin') {
        // Nanti kita buat halaman /admin
        router.push('/admin-dashboard'); 
      } else {
        // Nanti kita buat halaman /operasional
        router.push('/ops-dashboard');
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      // Lempar error agar bisa ditangkap oleh komponen LoginView
      throw new Error('Email atau password salah.');
    }
  }

  /**
   * Fungsi untuk Logout
   */
  function logout() {
    // 1. Hapus data dari state & localStorage
    localStorage.removeItem('token');
    token.value = null;
    user.value = null;

    // 2. Hapus header default Axios
    delete apiClient.defaults.headers.common['Authorization'];

    // 3. Redirect ke Halaman Beranda
    router.push('/');
  }

  /**
   * Fungsi untuk cek token saat app load
   * (Nanti kita panggil di App.vue)
   */
  function checkAuth() {
    if (token.value) {
      try {
        const decoded = jwtDecode<UserPayload>(token.value);
        user.value = decoded;
        apiClient.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${token.value}`;
      } catch (error) {
        // Token invalid atau expired
        logout();
      }
    }
  }
  
  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isOperasional,
    login,
    logout,
    checkAuth,
  };
});