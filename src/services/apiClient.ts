import axios from 'axios';

/** Shared Axios instance — all requests go through MSW in dev */
export const apiClient = axios.create({
  baseURL: import.meta.env['VITE_API_BASE_URL'] ?? '/api',
});
