import axios from 'axios';

export const API =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const http = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json'
  }
});

http.interceptors.request.use(config => {
  const token = localStorage.getItem('nexus_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const signup = data => http.post('/auth/signup', data);
export const login = data => http.post('/auth/login', data);

export const saveRule = data => http.post('/rules', data);
export const ingest = data => http.post('/telemetry', data);
export const getTelemetry = () => http.get('/telemetry');
export const getAlerts = () => http.get('/alerts');
export const updateSettings = data => http.patch('/settings', data);
