import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/services/api';
import { jwtDecode } from 'jwt-decode';

interface UserPayload {
  id: string;
  username: string;
  email: string;
}

interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
  expiresIn: number;
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();
  const token = ref<string | null>(localStorage.getItem('token'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
  const cachedUser = localStorage.getItem('user');
  const user = ref<UserPayload | null>(cachedUser ? JSON.parse(cachedUser) : null);

  const isAuthenticated = computed(() => !!token.value);

  if (token.value) {
    setAuthHeader(token.value);
  }

  function setAuthHeader(accessToken: string | null) {
    if (accessToken) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }

  function persistUser(profile: UserPayload | null) {
    user.value = profile;
    if (profile) {
      localStorage.setItem('user', JSON.stringify(profile));
    } else {
      localStorage.removeItem('user');
    }
  }

  function persistTokens(accessToken: string, refreshTokenValue: string) {
    token.value = accessToken;
    refreshToken.value = refreshTokenValue;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshTokenValue);
    setAuthHeader(accessToken);
  }

  function clearSession() {
    token.value = null;
    refreshToken.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    persistUser(null);
    setAuthHeader(null);
  }

  async function login(email: string, password: string) {
    try {
      const { data } = await apiClient.post<AuthSessionResponse>('/auth/login', {
        email,
        password,
      });
      applySession(data);
      router.push('/');
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Email atau password salah.');
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      console.warn('Failed to revoke tokens on logout', error);
    }
    clearSession();
    router.push('/login');
  }

  async function refreshSession() {
    if (!refreshToken.value) {
      throw new Error('Refresh token tidak tersedia');
    }
    const { data } = await apiClient.post<AuthSessionResponse>('/auth/refresh', {
      refreshToken: refreshToken.value,
    });
    applySession(data);
    return data;
  }

  function isTokenExpired(accessToken: string) {
    try {
      const decoded = jwtDecode<{ exp?: number }>(accessToken);
      if (!decoded.exp) return false;
      const expiresAt = decoded.exp * 1000;
      return Date.now() + 5000 >= expiresAt;
    } catch (error) {
      return true;
    }
  }

  async function checkAuth() {
    if (!token.value) return;

    if (isTokenExpired(token.value)) {
      try {
        await refreshSession();
        return;
      } catch (error) {
        clearSession();
        return;
      }
    }

    if (!user.value) {
      try {
        const { data } = await apiClient.get<UserPayload>('/auth/me');
        persistUser(data);
      } catch (error) {
        if (refreshToken.value) {
          try {
            await refreshSession();
            return;
          } catch (_) {
            clearSession();
            return;
          }
        }
        clearSession();
      }
    }
  }

  function applySession(session: AuthSessionResponse) {
    persistTokens(session.accessToken, session.refreshToken);
    persistUser(session.user);
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    refreshSession,
  };
});
