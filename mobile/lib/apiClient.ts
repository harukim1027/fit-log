import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

const apiClient = axios.create({ baseURL: API_URL, timeout: 10000 });

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params ?? '');
  return config;
});

let _onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler;
};

apiClient.interceptors.response.use(
  (res) => {
    console.log(`[API] ✓ ${res.status} ${res.config.url}`, Array.isArray(res.data) ? `[${res.data.length}]` : '');
    return res;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const msg = error.code === 'ECONNABORTED' ? 'timeout' : (error.message ?? '');
    console.error(`[API] ✗ ${status ?? 'ERR'} ${url} — ${msg}`);
    if (status === 401 && _onUnauthorized) {
      _onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default apiClient;