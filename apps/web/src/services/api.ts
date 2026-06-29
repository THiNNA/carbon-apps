import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for Token Refresh Queueing
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Standardize resolving data structure
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        // Redirect to login if token refresh is impossible
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/api/v1/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // แจ้ง auth context ให้ decode JWT ใหม่ เพื่ออัปเดต departmentId/organizationId ใน payload
        window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { accessToken } }));

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        // Clear local storage on refresh failure and boot to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Map server errors or fallback to default structures
    const standardError = error.response?.data || {
      success: false,
      message: error.message || 'Network error occurred',
      errors: [],
    };

    // Handle License Error (HTTP 402 Payment Required)
    if (error.response?.status === 402) {
      const isLicenseInvalid = standardError.errors?.some((err: any) => err.message === 'LICENSE_INVALID');
      if (isLicenseInvalid && window.location.pathname !== '/license-activation') {
        window.location.href = '/license-activation';
        return Promise.reject(standardError);
      }
    }

    return Promise.reject(standardError);
  }
);

export default api;
