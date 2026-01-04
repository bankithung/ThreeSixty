/**
 * Authentication API endpoints
 */

import apiClient, { storeTokens, clearTokens } from './client';
import { AuthResponse, User } from '../types/models';

export const authApi = {
    /**
     * Send OTP to phone number
     */
    sendOTP: async (phone: string, purpose: string = 'login'): Promise<{ message: string; phone: string }> => {
        const response = await apiClient.post('/auth/send-otp/', { phone, purpose });
        return response.data;
    },

    /**
     * Verify OTP and login
     */
    verifyOTP: async (
        phone: string,
        otp: string,
        fcmToken?: string,
        deviceType?: 'android' | 'ios'
    ): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/verify-otp/', {
            phone,
            otp,
            fcm_token: fcmToken,
            device_type: deviceType,
        });

        // Store tokens
        await storeTokens(response.data.access, response.data.refresh);

        return response.data;
    },

    /**
     * Admin login with email/password
     */
    adminLogin: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/login/', { email, password });

        // Store tokens
        await storeTokens(response.data.access, response.data.refresh);

        return response.data;
    },

    /**
     * Logout - invalidate token
     */
    logout: async (): Promise<void> => {
        try {
            const { getRefreshToken } = await import('./client');
            const refreshToken = await getRefreshToken();
            if (refreshToken) {
                await apiClient.post('/auth/logout/', { refresh: refreshToken });
            }
        } catch (error) {
            // Ignore errors during logout
        } finally {
            await clearTokens();
        }
    },

    /**
     * Get current user profile
     */
    getProfile: async (): Promise<User> => {
        const response = await apiClient.get('/auth/profile/');
        return response.data;
    },

    /**
     * Update user profile
     */
    updateProfile: async (data: Partial<User>): Promise<User> => {
        const response = await apiClient.patch('/auth/profile/', data);
        return response.data;
    },

    /**
     * Update FCM token for push notifications
     */
    updateFCMToken: async (fcmToken: string, deviceType: 'android' | 'ios'): Promise<void> => {
        await apiClient.post('/auth/fcm-token/', {
            fcm_token: fcmToken,
            device_type: deviceType,
        });
    },
};

export default authApi;
