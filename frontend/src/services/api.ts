// /frontend/src/services/api.ts
import axios from 'axios';

// Buat instance axios yang terpusat
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;