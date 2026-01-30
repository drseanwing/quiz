/**
 * @file        API service
 * @description Axios-based API client with interceptors
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Axios instance for API requests
 */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add auth token
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors
 */
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // TODO: Implement token refresh logic
    // TODO: Handle specific error codes
    return Promise.reject(error);
  }
);

export default api;
