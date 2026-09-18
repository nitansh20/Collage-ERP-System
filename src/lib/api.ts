import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('college_erp_jwt_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const activePersonaId = localStorage.getItem('college_erp_active_persona_id');
  if (activePersonaId) {
    config.headers['x-user-id'] = activePersonaId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('college_erp_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          if (res.data?.success && res.data?.accessToken) {
            localStorage.setItem('college_erp_jwt_token', res.data.accessToken);
            if (res.data.refreshToken) {
              localStorage.setItem('college_erp_refresh_token', res.data.refreshToken);
            }
            originalRequest.headers['Authorization'] = `Bearer ${res.data.accessToken}`;
            return axios(originalRequest);
          }
        } catch {
          // Token refresh failed or revoked - clear authentication storage
          localStorage.removeItem('college_erp_jwt_token');
          localStorage.removeItem('college_erp_refresh_token');
          localStorage.removeItem('college_erp_authenticated');
          localStorage.removeItem('college_erp_active_persona_id');
        }
      }
    }
    return Promise.reject(error);
  }
);
