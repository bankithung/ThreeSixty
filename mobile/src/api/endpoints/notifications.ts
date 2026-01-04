/**
 * Notifications API endpoints
 */

import apiClient from '../client';
import { Notification } from '../../types/models';

export const notificationsApi = {
    /**
     * Get notifications list
     */
    getNotifications: async (limit: number = 50, isRead?: boolean): Promise<Notification[]> => {
        const params: { limit: number; is_read?: string } = { limit };
        if (isRead !== undefined) {
            params.is_read = isRead.toString();
        }
        const response = await apiClient.get('/notifications/', { params });
        return response.data;
    },

    /**
     * Get notification detail (marks as read)
     */
    getNotification: async (id: string): Promise<Notification> => {
        const response = await apiClient.get(`/notifications/${id}/`);
        return response.data;
    },

    /**
     * Mark all notifications as read
     */
    markAllRead: async (): Promise<{ message: string }> => {
        const response = await apiClient.post('/notifications/mark-all-read/');
        return response.data;
    },

    /**
     * Get unread count
     */
    getUnreadCount: async (): Promise<{ unread_count: number }> => {
        const response = await apiClient.get('/notifications/unread-count/');
        return response.data;
    },
};

export default notificationsApi;
