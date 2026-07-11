import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1', withCredentials: true, headers: { Accept: 'application/json' } });

let csrfToken;
api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method) && config.url?.includes('/auth/logout')) {
    if (!csrfToken) csrfToken = (await api.get('/auth/csrf')).data.data.csrfToken;
    config.headers['x-csrf-token'] = csrfToken;
  }
  return config;
});

export function apiMessage(error) {
  return error.response?.data?.error?.message || 'We could not complete the request. Please try again.';
}
