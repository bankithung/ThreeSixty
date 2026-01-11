import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { api } from '../store/api';
import { WS_BASE_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useUserSocket = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(async () => {
        if (!isAuthenticated || wsRef.current) return;

        const token = await AsyncStorage.getItem('@auth_access_token');
        // Note: In real app, might need to pass token in query param or header if WS supports it
        // Or ensure cookies are set. Django Channels often needs query param for token auth.
        // Assuming your backend handles auth via middleware or similar to 'useWebSocket'.

        // For simplicity, we assume generic 'useWebSocket' pattern which relies on some auth mechanism
        // But usually query param ?token=... is safest for React Native
        const wsUrl = `${WS_BASE_URL}/user/notifications/?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('User Notification Socket Connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('User Socket Message:', data);

                if (data.type === 'trip_started' || data.type === 'trip_ended') {
                    // Invalidate caches to refresh data
                    dispatch(api.util.invalidateTags(['Children', 'Trip', 'Attendance']));
                    console.log('Refetching child data due to trip event');
                }

                // Handle generic notifications
                if (data.type === 'notification') {
                    dispatch(api.util.invalidateTags(['Notification']));
                }

            } catch (error) {
                console.error('Socket parse error:', error);
            }
        };

        ws.onclose = () => {
            console.log('User Socket Disconnected');
            wsRef.current = null;

            // Reconnect logic
            if (isAuthenticated) {
                reconnectTimeoutRef.current = setTimeout(connect, 5000);
            }
        };

        ws.onerror = (e) => {
            console.log('User Socket Error', e);
        };

        wsRef.current = ws;
    }, [isAuthenticated, dispatch]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            connect();
        } else {
            disconnect();
        }
        return () => disconnect();
    }, [isAuthenticated, connect, disconnect]);
};
