// API 封装：axios 实例 + token 自动刷新 + 统一错误提示
import axios from 'axios';
import { toast } from '../composables/useToast';
import { useAuthStore } from '../stores/auth';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 35000,
});

let refreshing = null;

api.interceptors.request.use(config => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
    // 公网边缘代理会覆盖标准 Authorization 头，自定义头 X-Auth-Token 可穿透
    config.headers['X-Auth-Token'] = auth.token;
  }
  return config;
});

api.interceptors.response.use(
  res => {
    const body = res.data;
    if (body && body.code === 0) return body.data;
    return Promise.reject(new Error(body?.message || '请求失败'));
  },
  async error => {
    const auth = useAuthStore();
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && auth.refreshToken) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios.post('/api/v1/auth/refresh', { refresh_token: auth.refreshToken });
        }
        const r = await refreshing;
        refreshing = null;
        if (r.data?.code === 0) {
          auth.setTokens(r.data.data.token, r.data.data.refresh_token);
          original.headers.Authorization = `Bearer ${r.data.data.token}`;
          original.headers['X-Auth-Token'] = r.data.data.token;
          return api(original);
        }
        throw new Error('refresh failed');
      } catch {
        refreshing = null;
        auth.logout();
        location.hash = '#/login';
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }
    }
    const msg = error.response?.data?.message || error.message || '网络异常';
    const wrapped = new Error(msg);
    wrapped.status = error.response?.status;
    if (msg !== '未登录') toast.error(msg);
    return Promise.reject(wrapped);
  }
);

export default api;
