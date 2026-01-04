/**
 * Notification Redux Slice - Enhanced with RTK Query
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../../types/models';
import { api } from '../api';

interface NotificationState {
    // For real-time notifications from WebSocket
    realtimeNotifications: Notification[];
}

const initialState: NotificationState = {
    realtimeNotifications: [],
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        // Add notification from WebSocket/Push
        addRealtimeNotification: (state, action: PayloadAction<Notification>) => {
            state.realtimeNotifications.unshift(action.payload);
        },

        // Clear realtime notifications
        clearRealtimeNotifications: (state) => {
            state.realtimeNotifications = [];
        },
    },
});

export const {
    addRealtimeNotification,
    clearRealtimeNotifications
} = notificationSlice.actions;

export default notificationSlice.reducer;
