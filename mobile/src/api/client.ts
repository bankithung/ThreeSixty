/**
 * API Client - Axios instance with interceptors
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

// Storage keys
const ACCESS_TOKEN_KEY = '@auth_access_token';
const REFRESH_TOKEN_KEY = '@auth_refresh_token';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Store tokens
export const storeTokens = async (access: string, refresh: string): Promise<void> => {
    await AsyncStorage.multiSet([
        [ACCESS_TOKEN_KEY, access],
        [REFRESH_TOKEN_KEY, refresh],
    ]);
};

// Get access token
export const getAccessToken = async (): Promise<string | null> => {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
};

// Get refresh token
export const getRefreshToken = async (): Promise<string | null> => {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

// Clear tokens
export const clearTokens = async (): Promise<void> => {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // If 401 and we haven't tried refreshing yet
        if (
            error.response?.status === 401 &&
            originalRequest &&
            !(originalRequest as any)._retry
        ) {
            (originalRequest as any)._retry = true;

            try {
                const refreshToken = await getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Try to refresh token
                const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;
                await AsyncStorage.setItem(ACCESS_TOKEN_KEY, access);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                await clearTokens();
                // TODO: Emit event to navigate to login
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
