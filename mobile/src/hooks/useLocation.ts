/**
 * Custom hook for location tracking
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';
import { LOCATION_UPDATE_INTERVAL } from '../constants/config';

interface LocationState {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
    timestamp: number;
}

interface UseLocationOptions {
    enableHighAccuracy?: boolean;
    interval?: number;
    onUpdate?: (location: LocationState) => void;
    autoStart?: boolean;
}

export const useLocation = ({
    enableHighAccuracy = true,
    interval = LOCATION_UPDATE_INTERVAL,
    onUpdate,
    autoStart = false,
}: UseLocationOptions = {}) => {
    const [location, setLocation] = useState<LocationState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<number | null>(null);

    const onUpdateRef = useRef(onUpdate);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const requestPermission = async (): Promise<boolean> => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'ThreeSixty needs access to your location for bus tracking.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.error('Permission request error:', err);
                return false;
            }
        }
        return true; // iOS handles permissions differently
    };

    const getCurrentLocation = useCallback(async (): Promise<LocationState | null> => {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
            setError('Location permission denied');
            return null;
        }

        return new Promise((resolve) => {
            Geolocation.getCurrentPosition(
                (position) => {
                    const loc: LocationState = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        speed: position.coords.speed,
                        heading: position.coords.heading,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp,
                    };
                    setLocation(loc);
                    setError(null);
                    resolve(loc);
                },
                (err) => {
                    setError(err.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy,
                    timeout: 20000,
                    maximumAge: 1000,
                }
            );
        });
    }, [enableHighAccuracy]);

    const startTracking = useCallback(async () => {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
            setError('Location permission denied');
            return;
        }

        setIsTracking(true);

        // Force an initial fix immediately
        Geolocation.getCurrentPosition(
            (position) => {
                const loc: LocationState = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                };
                setLocation(loc);
                setError(null);
                if (onUpdateRef.current) {
                    onUpdateRef.current(loc);
                }
            },
            (err) => {
                console.log('Initial location fix failed:', err);
            },
            {
                enableHighAccuracy,
                timeout: 15000,
                maximumAge: 10000,
            }
        );

        watchIdRef.current = Geolocation.watchPosition(
            (position) => {
                const loc: LocationState = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                };
                setLocation(loc);
                setError(null);
                if (onUpdateRef.current) {
                    onUpdateRef.current(loc);
                }
            },
            (err) => {
                setError(err.message);
            },
            {
                enableHighAccuracy,
                distanceFilter: 10, // meters
                interval,
                fastestInterval: interval / 2,
            }
        );
    }, [enableHighAccuracy, interval]);

    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            Geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
    }, []);

    // Auto-start if enabled
    useEffect(() => {
        if (autoStart) {
            startTracking();
        }
        return () => {
            stopTracking();
        };
    }, [autoStart, startTracking, stopTracking]);

    return {
        location,
        error,
        isTracking,
        getCurrentLocation,
        startTracking,
        stopTracking,
        requestPermission,
    };
};

export default useLocation;
