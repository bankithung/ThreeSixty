/**
 * Custom hook for WebSocket connection management
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateLiveLocation, setWsConnected, clearLiveLocation } from '../store/slices/tripSlice';
import { WS_BASE_URL } from '../constants/config';
import { LocationData } from '../types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const [token, setToken] = useState<string | null>(null);

    // Fetch token on mount
    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem('@auth_access_token');
            setToken(storedToken);
        };
        fetchToken();
    }, []);

    // Use refs for callbacks to avoid re-connecting when they change
    const onLocationUpdateRef = useRef(onLocationUpdate);
    const onAttendanceEventRef = useRef(onAttendanceEvent);
    const onTripStatusRef = useRef(onTripStatus);

    useEffect(() => {
        onLocationUpdateRef.current = onLocationUpdate;
        onAttendanceEventRef.current = onAttendanceEvent;
        onTripStatusRef.current = onTripStatus;
    }, [onLocationUpdate, onAttendanceEvent, onTripStatus]);

    const connect = useCallback(() => {
        if (!tripId || !token) return;

        // Force HTTPS/WSS if needed, though usually handled by config
        // Append token to query params for TokenAuthMiddleware
        const wsUrl = `${WS_BASE_URL}/trip/${tripId}/?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Trip WebSocket connected');
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
                            next_stop: data.data.next_stop, // Map next_stop
                        };
                        dispatch(updateLiveLocation(location));
                        if (onLocationUpdateRef.current) {
                            onLocationUpdateRef.current(location);
                        }
                        break;

                    case 'trip_info':
                        // Handle initial trip data
                        if (data.data.latest_location) {
                            const initialLocation: LocationData = {
                                latitude: data.data.latest_location.latitude,
                                longitude: data.data.latest_location.longitude,
                                speed: data.data.latest_location.speed,
                                heading: data.data.latest_location.heading,
                                timestamp: data.data.latest_location.timestamp || data.data.latest_location.created_at,
                                next_stop: data.data.latest_location.next_stop,
                            };
                            dispatch(updateLiveLocation(initialLocation));
                            if (onLocationUpdateRef.current) {
                                onLocationUpdateRef.current(initialLocation);
                            }
                        }
                        break;

                    case 'attendance_event':
                        if (onAttendanceEventRef.current) {
                            onAttendanceEventRef.current(data.data);
                        }
                        break;

                    case 'trip_status':
                        if (onTripStatusRef.current) {
                            onTripStatusRef.current(data.data);
                        }
                        break;

                    case 'pong':
                        // Heartbeat response
                        break;
                }
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };

        ws.onclose = (e) => {
            console.log('Trip WebSocket disconnected', e.code, e.reason);
            dispatch(setWsConnected(false));

            // Attempt reconnection
            if (reconnectAttempts.current < maxReconnectAttempts) {
                reconnectAttempts.current += 1;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                console.log(`Reconnecting to trip in ${delay}ms...`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current = ws;
    }, [tripId, token, dispatch]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        dispatch(setWsConnected(false));
        dispatch(clearLiveLocation());
    }, [dispatch]);

    const sendMessage = useCallback((message: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    // Connect when tripId OR token changes
    useEffect(() => {
        if (tripId && token) {
            connect();
        }
        // Cleanup function runs when tripId changes or component unmounts
        return () => {
            disconnect();
        };
    }, [tripId, token, connect, disconnect]);

    // Ping
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

