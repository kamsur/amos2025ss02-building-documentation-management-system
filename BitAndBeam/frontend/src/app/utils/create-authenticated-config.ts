import axios from 'axios';
import { Configuration } from '../../api'; // Adjust path if needed

export function createAuthenticatedConfig(basePath: string, token: string | null): Configuration {
  const axiosInstance = axios.create();

  axiosInstance.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return new Configuration({
    basePath,
    baseOptions: {
      adapter: axiosInstance.defaults.adapter
    }
  });
}
