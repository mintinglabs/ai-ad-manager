import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 90000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fb_long_lived_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
