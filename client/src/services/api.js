import axios from 'axios';

export function resolveApiBaseUrl({ isDevelopment = import.meta.env.DEV, configuredUrl = import.meta.env.VITE_API_URL } = {}) {
  if (!isDevelopment) return '/api/v1';
  return configuredUrl || 'http://localhost:5000/api/v1';
}

export const api = axios.create({ baseURL: resolveApiBaseUrl(), withCredentials: true, headers: { Accept: 'application/json' } });

let csrfToken;
api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method) && !config.url?.includes('/auth/csrf')) {
    if (!csrfToken) csrfToken = (await api.get('/auth/csrf')).data.data.csrfToken;
    config.headers['x-csrf-token'] = csrfToken;
  }
  return config;
});

let refreshRequest;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isAuthenticationRequest = request?.url?.includes('/login')
      || request?.url?.includes('/register')
      || request?.url?.includes('/refresh');

    if (error.response?.status !== 401 || request?._sessionRetry || isAuthenticationRequest) {
      return Promise.reject(error);
    }

    request._sessionRetry = true;
    try {
      if (!refreshRequest) {
        refreshRequest = api.post('/auth/refresh').finally(() => { refreshRequest = undefined; });
      }
      await refreshRequest;
      return api(request);
    } catch {
      return Promise.reject(error);
    }
  },
);

export function apiMessage(error) {
  return error.response?.data?.error?.message || 'We could not complete the request. Please try again.';
}
