// /frontend/src/services/api.ts
import axios from 'axios';

// Buat instance axios yang terpusat
const apiClient = axios.create({
  // URL backend Nest.js kita
  baseURL: 'http://localhost:3000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;