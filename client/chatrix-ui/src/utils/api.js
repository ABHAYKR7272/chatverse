import axios from 'axios';

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
});

// Attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('chatrix_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('chatrix_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const SERVER_URL = BASE_URL;
export default api;
