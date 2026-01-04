/**
 * Custom hook for WebSocket connection management
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateLiveLocation, setWsConnected } from '../store/slices/tripSlice';
import { addRealtimeNotification } from '../store/slices/notificationSlice';
import { WS_BASE_URL } from '../constants/config';
import { LocationData, Notification } from '../types/models';

interface UseWebSocketOptions {
    tripId: string | null;
    onLocationUpdate?: (location: LocationData) => void;
    onAttendanceEvent?: (data: any) => void;
    onTripStatus?: (data: any) => void;
}

export const useWebSocket = ({
    tripId,
    onLocationUpdate,
    onAttendanceEvent,
    onTripStatus,
}: UseWebSocketOptions) => {
    const dispatch = useAppDispatch();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (!tripId) return;

        const ws = new WebSocket(`${WS_BASE_URL}/trip/${tripId}/`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            dispatch(setWsConnected(true));
            reconnectAttempts.current = 0;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'location_update':
                        const location: LocationData = {
                            latitude: data.data.latitude,
                            longitude: data.data.longitude,
                            speed: data.data.speed,
                            heading: data.data.heading,
                            timestamp: data.data.timestamp,
                        };
                        dispatch(updateLiveLocation(location));
                        onLocationUpdate?.(location);
                        break;

                    case 'attendance_event':
                        onAttendanceEvent?.(data.data);
                        break;

                    case 'trip_status':
                        onTripStatus?.(data.data);
                        break;

                    case 'pong':
                        // Heartbeat response
                        break;
                }
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            dispatch(setWsConnected(false));

            // Attempt reconnection
            if (reconnectAttempts.current < maxReconnectAttempts) {
                reconnectAttempts.current += 1;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                console.log(`Reconnecting in ${delay}ms...`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current = ws;
    }, [tripId, dispatch, onLocationUpdate, onAttendanceEvent, onTripStatus]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        dispatch(setWsConnected(false));
    }, [dispatch]);

    const sendMessage = useCallback((message: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    // Connect when tripId changes
    useEffect(() => {
        if (tripId) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [tripId, connect, disconnect]);

    // Ping to keep connection alive
    useEffect(() => {
        const pingInterval = setInterval(() => {
            sendMessage({ type: 'ping' });
        }, 30000);

        return () => clearInterval(pingInterval);
    }, [sendMessage]);

    return {
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        sendMessage,
        disconnect,
        reconnect: connect,
    };
};

export default useWebSocket;
