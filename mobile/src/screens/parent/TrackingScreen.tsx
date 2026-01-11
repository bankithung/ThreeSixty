/**
 * TrackingScreen - Premium Real-time Bus Tracking
 * Uber/Zomato-style live tracking experience
 */

import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Dimensions,
    Linking,
    Platform,
    ScrollView,
    Animated,
    StatusBar,
    PanResponder,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
import { ParentTabScreenProps } from '../../types/navigation';
import { useAppDispatch, useAppSelector, useWebSocket } from '../../hooks';
import { selectChild, clearLiveLocation } from '../../store/slices/tripSlice';
import {
    useGetChildrenQuery,
    useGetChildTripQuery,
    useGetTripTrackingQuery,
    useGetChildStatusQuery,
} from '../../store/api';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Avatar, LoadingSpinner } from '../../components/common';
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE, GOOGLE_MAPS_API_KEY } from '../../constants/config';

// Polyline decoder utility
const decodePolyline = (t: string) => {
    let points = [];
    let index = 0, len = t.length;
    let lat = 0, lng = 0;
    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = t.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = t.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        points.push({ latitude: (lat / 1E5), longitude: (lng / 1E5) });
    }
    return points;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Professional muted color palette - matching Dashboard
const COLORS = {
    primary: '#4f46e5',      // Indigo accent (was #4361ee)
    primaryLight: '#6366f1',
    secondary: '#059669',    // Muted green
    dark: '#1a1a2e',
    darkGray: '#2d2d44',     // Dashboard style
    mediumGray: '#4a4a68',   // Dashboard style
    lightGray: '#8a8aa3',    // Dashboard style
    surface: '#ffffff',
    background: '#f8f9fa',   // Dashboard surface
    cardBg: '#ffffff',
    success: '#059669',      // Dashboard success
    successLight: '#d1fae5',
    warning: '#d97706',      // Dashboard warning
    warningLight: '#fef3c7',
    error: '#dc2626',        // Dashboard error
    border: '#e5e7eb',
    shadow: 'rgba(0, 0, 0, 0.08)',
};

const TrackingScreen: React.FC<ParentTabScreenProps<'Track'>> = ({
    route,
    navigation,
}) => {
    const dispatch = useAppDispatch();
    const { selectedChildId, liveLocation, wsConnected } = useAppSelector((state) => state.trip);
    const mapRef = useRef<MapView>(null);
    const bottomSheetAnim = useRef(new Animated.Value(0)).current;
    const bottomSheetTranslateY = useRef(new Animated.Value(0)).current;
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(true);
    const [isMapReady, setIsMapReady] = useState(false);
    const [lastCenteredChildId, setLastCenteredChildId] = useState<string | null>(null);
    const [isChildDropdownOpen, setIsChildDropdownOpen] = useState(false);

    // Real-time Route State
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [eta, setEta] = useState<string | null>(null);
    const [distanceRemaining, setDistanceRemaining] = useState<string | null>(null);
    const [nextStopName, setNextStopName] = useState<string | null>(null);
    const lastFetchTimeRef = useRef<number>(0);

    // Track last search coords to avoid redundant calls but allow corrections
    const lastFetchCoords = useRef<{ startLat: number, startLng: number, endLat: number, endLng: number } | null>(null);

    // Fetch Route from Google Directions API
    const fetchRoute = useCallback(async (
        startLat: number,
        startLng: number,
        endLat: number,
        endLng: number,
        waypoints: { latitude: number; longitude: number }[] = []
    ) => {
        const now = Date.now();

        // Calculate distance from last fetch to see if we moved significantly (e.g. > 100m)
        // This prevents locking in a "Default Location" route if real location comes in 1s later
        let hasMovedSignificantly = true;
        if (lastFetchCoords.current) {
            const dStart = Math.sqrt(Math.pow(startLat - lastFetchCoords.current.startLat, 2) + Math.pow(startLng - lastFetchCoords.current.startLng, 2));
            const dEnd = Math.sqrt(Math.pow(endLat - lastFetchCoords.current.endLat, 2) + Math.pow(endLng - lastFetchCoords.current.endLng, 2));
            // Approx 0.001 degrees is ~111m
            if (dStart < 0.001 && dEnd < 0.001) {
                hasMovedSignificantly = false;
            }
        }

        // Throttle API calls (15 seconds) ONLY if haven't moved much
        if (!hasMovedSignificantly && now - lastFetchTimeRef.current < 15000 && routeCoordinates.length > 0) {
            return;
        }

        try {
            console.log('[TrackingScreen] Fetching new route. Start:', startLat, startLng, 'End:', endLat, endLng);

            let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLat},${startLng}&destination=${endLat},${endLng}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

            // Add waypoints if available
            if (waypoints.length > 0) {
                const waypointsStr = waypoints
                    .map(wp => `${wp.latitude},${wp.longitude}`)
                    .join('%7C');
                url += `&waypoints=${waypointsStr}`;
            }

            const response = await fetch(url);
            const result = await response.json();

            if (result.status === 'OK' && result.routes.length) {
                const points = decodePolyline(result.routes[0].overview_polyline.points);
                setRouteCoordinates(points);

                // Update last success coords and time
                lastFetchCoords.current = { startLat, startLng, endLat, endLng };
                lastFetchTimeRef.current = now;

                // Update ETA and Distance
                let totalDuration = 0;
                let totalDistance = 0;

                result.routes[0].legs.forEach((leg: any) => {
                    totalDuration += leg.duration?.value || 0;
                    totalDistance += leg.distance?.value || 0;
                });

                // Format duration
                const hours = Math.floor(totalDuration / 3600);
                const minutes = Math.floor((totalDuration % 3600) / 60);
                const durationText = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
                setEta(durationText);

                // Format distance
                const distanceKm = (totalDistance / 1000).toFixed(1);
                setDistanceRemaining(`${distanceKm} km`);

            } else {
                console.warn('[TrackingScreen] Directions API Error:', result.status, result.error_message);
            }
        } catch (error) {
            console.error('Error fetching route:', error);
        }
    }, [routeCoordinates.length]);

    // Constants for bottom sheet
    const BOTTOM_SHEET_MIN_HEIGHT = 150;
    const BOTTOM_SHEET_MAX_HEIGHT = 300;
    const DRAG_THRESHOLD = 50;

    // Ref to track expanded state for PanResponder
    const isExpandedRef = useRef(true);

    // Keep ref in sync with state
    useEffect(() => {
        isExpandedRef.current = isBottomSheetExpanded;
    }, [isBottomSheetExpanded]);

    // PanResponder for draggable bottom sheet
    const panResponder = useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                const MAX_TRANSLATE = BOTTOM_SHEET_MAX_HEIGHT - BOTTOM_SHEET_MIN_HEIGHT;
                const startPos = isExpandedRef.current ? 0 : MAX_TRANSLATE;
                const unsanitizedY = startPos + gestureState.dy;
                // Clamp between 0 (Expanded) and MAX_TRANSLATE (Collapsed/Hidden)
                const newY = Math.max(0, Math.min(unsanitizedY, MAX_TRANSLATE));
                bottomSheetTranslateY.setValue(newY);
            },
            onPanResponderRelease: (_, gestureState) => {
                const MAX_TRANSLATE = BOTTOM_SHEET_MAX_HEIGHT - BOTTOM_SHEET_MIN_HEIGHT;

                // Logic based on drag direction and threshold
                if (gestureState.dy > DRAG_THRESHOLD) {
                    // Dragged down significantly -> Collapse
                    Animated.spring(bottomSheetTranslateY, {
                        toValue: MAX_TRANSLATE,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 10,
                    }).start();
                    setIsBottomSheetExpanded(false);
                } else if (gestureState.dy < -DRAG_THRESHOLD) {
                    // Dragged up significantly -> Expand
                    Animated.spring(bottomSheetTranslateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 10,
                    }).start();
                    setIsBottomSheetExpanded(true);
                } else {
                    // Snap back to nearest state
                    Animated.spring(bottomSheetTranslateY, {
                        toValue: isExpandedRef.current ? 0 : MAX_TRANSLATE,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 10,
                    }).start();
                }
            },
        }), [bottomSheetTranslateY]);

    // Fetch children
    const { data: children = [], isLoading: isLoadingChildren } = useGetChildrenQuery();

    // Determine active student
    const studentId = route.params?.studentId || selectedChildId || (children.length > 0 ? children[0].id : undefined);

    // Fetch trip data for selected child
    const {
        data: childTripData,
        isLoading: isLoadingTrip,
        refetch: refetchTrip,
        isFetching: isFetchingTrip,
    } = useGetChildTripQuery(studentId!, {
        skip: !studentId,
        pollingInterval: wsConnected ? 0 : 10000,
    });

    const activeTripId = childTripData?.trip?.id;

    // Fetch extended tracking data (staff info, polyline, stops)
    const { data: trackingData } = useGetTripTrackingQuery(activeTripId!, {
        skip: !activeTripId,
    });

    const selectedChild = useMemo(
        () => children.find((c) => c.id === studentId),
        [children, studentId]
    );

    const activeTrip = childTripData?.trip;

    // WebSocket for real-time updates
    // WebSocket for real-time updates
    const { isConnected } = useWebSocket({
        tripId: activeTrip?.id || null,
        onLocationUpdate: (location) => {
            if (mapRef.current && isMapReady) {
                mapRef.current.animateCamera({
                    center: {
                        latitude: Number(location.latitude),
                        longitude: Number(location.longitude),
                    },
                    zoom: 15,
                }, { duration: 800 });
            }
        },
        onAttendanceEvent: (data) => {
            console.log('[TrackingScreen] Real-time Attendance Event:', data);
            // Refresh data immediately when any attendance event occurs
            // This handles boarding/dropping events to update route destination
            refetchStatus();
            refetchTrip();
        }
    });

    // Calculate display location
    const displayLocation = useMemo(() => {
        if (liveLocation?.latitude && liveLocation?.longitude) {
            return {
                latitude: Number(liveLocation.latitude),
                longitude: Number(liveLocation.longitude),
            };
        }
        if (childTripData?.latest_location?.latitude && childTripData?.latest_location?.longitude) {
            return {
                latitude: Number(childTripData.latest_location.latitude),
                longitude: Number(childTripData.latest_location.longitude),
            };
        }
        if (selectedChild?.pickup_latitude && selectedChild?.pickup_longitude) {
            return {
                latitude: Number(selectedChild.pickup_latitude),
                longitude: Number(selectedChild.pickup_longitude),
            };
        }
        return { latitude: DEFAULT_LATITUDE || 25.9716, longitude: DEFAULT_LONGITUDE || 93.727 };
    }, [liveLocation, childTripData, selectedChild]);

    const initialRegion = {
        ...displayLocation,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
    };

    // Handle child selection with map re-centering
    const handleChildSelect = useCallback((childId: string) => {
        // ... (existing logging code) ...
        const child = children.find((c) => c.id === childId);

        // Clear previous location state
        dispatch(clearLiveLocation());

        if (childId !== studentId) {
            dispatch(selectChild(childId));
            navigation.setParams({ studentId: childId });
        }

        // Try to center on live location first, then pickup location
        let targetLat: number | null = null;
        let targetLng: number | null = null;

        // Priority 1: Current live location for this trip
        if (liveLocation?.latitude && liveLocation?.longitude) {
            targetLat = Number(liveLocation.latitude);
            targetLng = Number(liveLocation.longitude);
        }
        // Priority 2: Latest location from API
        else if (childTripData?.latest_location?.latitude && childTripData?.latest_location?.longitude) {
            targetLat = Number(childTripData.latest_location.latitude);
            targetLng = Number(childTripData.latest_location.longitude);
        }
        // Priority 3: Child's pickup location
        else if (child?.pickup_latitude && child?.pickup_longitude) {
            targetLat = Number(child.pickup_latitude);
            targetLng = Number(child.pickup_longitude);
        }
        // Priority 4: displayLocation fallback
        else if (displayLocation.latitude && displayLocation.longitude) {
            targetLat = displayLocation.latitude;
            targetLng = displayLocation.longitude;
        }

        if (targetLat && targetLng && mapRef.current && !isNaN(targetLat) && !isNaN(targetLng)) {
            mapRef.current.animateToRegion({
                latitude: targetLat,
                longitude: targetLng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }

        setLastCenteredChildId(childId);
    }, [dispatch, navigation, studentId, children, liveLocation, childTripData, displayLocation]);

    // Fetch child status for dynamic routing
    const { data: childStatus, refetch: refetchStatus } = useGetChildStatusQuery(studentId!, {
        skip: !studentId,
        pollingInterval: wsConnected ? 0 : 5000, // Optimize polling: Stop if WS connected
    });

    // Re-center map when child changes or trip data loads
    useEffect(() => {
        if (!isMapReady || !studentId) return;

        // Calculate Route when child or location changes
        const currentLoc = displayLocation;

        // Define Destination Logic
        let destLat: number | null = null;
        let destLng: number | null = null;
        const isMorningTrip = activeTrip?.trip_type === 'morning';
        const isBoarded = childStatus?.status === 'on_bus';

        if (isMorningTrip) {
            if (!isBoarded) {
                // Morning: Bus is coming to pick up student
                // Destination: Student's Pickup Location (Home)
                destLat = Number(selectedChild?.pickup_latitude);
                destLng = Number(selectedChild?.pickup_longitude);
            } else {
                // Morning: Student is on bus
                // Destination: School
                destLat = Number(selectedChild?.school_latitude);
                destLng = Number(selectedChild?.school_longitude);
            }
        } else {
            // Evening (PM): Bus is dropping student
            // Destination: Student's Drop Location (Home)
            // Even if not boarded yet (waiting at school), parental interest is path to home.
            destLat = Number(selectedChild?.drop_latitude);
            destLng = Number(selectedChild?.drop_longitude);

            // Fallback to pickup (home) if drop is missing, assuming same location
            if (!destLat && selectedChild?.pickup_latitude) {
                destLat = Number(selectedChild.pickup_latitude);
                destLng = Number(selectedChild.pickup_longitude);
            }
        }

        if (currentLoc.latitude && currentLoc.longitude && destLat && destLng) {
            // Prepare waypoints from trackingData.stops
            let waypoints: { latitude: number; longitude: number }[] = [];

            if (trackingData?.stops?.length) {
                const nextSeq = liveLocation?.next_stop?.sequence || 0;

                // Sort by order/sequence
                const sortedStops = [...trackingData.stops].sort((a, b) => a.order - b.order);

                // Determine user's stop sequence
                const userStopId = selectedChild?.stop || childTripData?.student_stop?.id;
                const userStop = sortedStops.find(s => s.id === userStopId);
                const userStopSeq = userStop?.order || 9999;

                let relevantStops = [];

                if (!isBoarded) {
                    // Case 1: Not Boarded -> Route to Pickup
                    // Include stops starting from next_stop UP TO (but excluding) the user's pickup stop
                    // (The destination IS the pickup stop, so we don't need it as a waypoint)
                    relevantStops = sortedStops.filter(s => s.order >= nextSeq && s.order < userStopSeq);
                } else {
                    // Case 2: Boarded -> Route to School/Drop
                    // Include ALL stops starting from next_stop
                    relevantStops = sortedStops.filter(s => s.order >= nextSeq);
                }

                // Limit waypoints to avoid URL overflow
                // If there are too many, we might prioritize immediate ones
                waypoints = relevantStops
                    .slice(0, 23)
                    .map(s => ({
                        latitude: Number(s.latitude),
                        longitude: Number(s.longitude)
                    }));
            }

            // Fetch route
            fetchRoute(currentLoc.latitude, currentLoc.longitude, destLat, destLng, waypoints);

            // Animate map if needed (only on first load or manual center)
            if (lastCenteredChildId !== studentId) {
                mapRef.current?.animateCamera({
                    center: currentLoc,
                    zoom: 15,
                    heading: liveLocation?.heading || 0,
                    pitch: 0,
                }, { duration: 1000 });
                setLastCenteredChildId(studentId);
            }
        }
    }, [studentId, isMapReady, displayLocation, selectedChild, fetchRoute, lastCenteredChildId, activeTrip?.trip_type, trackingData, liveLocation?.next_stop, childStatus?.status]);

    // Update Live Stats from Socket (Next Stop) - Logic placeholder
    useEffect(() => {
        // If the socket provides next_stop, update it here.
        // Assuming location update might contain metadata in future.
        // For now, we can infer "Next Stop" from route legs if we had waypoint data, 
        // but simpler is to rely on backend data if available.
        // Or we can just show "En Route".
    }, [liveLocation]);

    // Bottom sheet animation on trip load
    useEffect(() => {
        Animated.spring(bottomSheetAnim, {
            toValue: 1,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, [activeTrip?.id]);

    const handleCallDriver = useCallback(() => {
        const phone = trackingData?.staff?.driver?.phone;
        if (phone) Linking.openURL(`tel:${phone}`);
    }, [trackingData]);

    const handleCallConductor = useCallback(() => {
        const phone = trackingData?.staff?.conductor?.phone;
        if (phone) Linking.openURL(`tel:${phone}`);
    }, [trackingData]);

    const handleCenterMap = useCallback(() => {
        if (displayLocation.latitude && displayLocation.longitude) {
            mapRef.current?.animateCamera({
                center: displayLocation,
                zoom: 15,
            }, { duration: 500 });
        }
    }, [displayLocation]);

    // Use locally fetched route coordinates if available, else fallback to backend polyline
    const mapPolylineCoords = useMemo(() => {
        if (routeCoordinates.length > 0) return routeCoordinates;
        if (!trackingData?.route_polyline) return [];
        try {
            return decodePolyline(trackingData.route_polyline);
        } catch (e) {
            return [];
        }
    }, [routeCoordinates, trackingData?.route_polyline]);

    // Check if student has reached destination (Dropped)
    const isDropped = useMemo(() => {
        // If there is an active trip, ONLY show dropped if dropped from THIS trip
        if (activeTrip?.id) {
            return !!childStatus?.today_records?.some(
                (r: any) => r.trip === activeTrip.id && r.event_type === 'checkout'
            );
        }

        // If no active trip, respect the general status
        return childStatus?.status === 'dropped';
    }, [childStatus, activeTrip]);

    // Loading states
    if (isLoadingChildren) {
        return <LoadingSpinner fullScreen />;
    }

    if (children.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyState}>
                    <Icon name="child-care" size={64} color={COLORS.lightGray} />
                    <Text style={styles.emptyTitle}>No Children Found</Text>
                    <Text style={styles.emptySubtitle}>Please contact your school to link your children.</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Trip Completed Card Component (Rendered conditionally below)
    const renderTripCompletedCard = () => {
        // Determine if it was morning or evening trip
        let isMorning = activeTrip?.trip_type === 'morning';
        let arrivalTime = "Just now";
        // Attempt to find the specific checkout record
        const lastRecord = childStatus?.today_records?.[childStatus.today_records.length - 1];

        if (lastRecord) {
            if (lastRecord.trip_type) {
                isMorning = lastRecord.trip_type === 'morning';
            }
            if (lastRecord.timestamp) {
                const date = new Date(lastRecord.timestamp);
                arrivalTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }

        const locationName = isMorning ? "School" : "Home";

        return (
            <View style={[styles.bottomSheet, { height: 'auto', paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' }]}>
                <View style={styles.completedIcon}>
                    <Icon name={isMorning ? "school" : "home"} size={40} color={COLORS.success} />
                </View>

                <Text style={styles.completedTitle}>Trip Completed</Text>

                <View style={styles.completionDetails}>
                    <Text style={styles.studentNameLarge}>{selectedChild?.first_name} {selectedChild?.last_name}</Text>
                    <Text style={styles.arrivalText}>
                        Arrived at <Text style={{ fontWeight: '700', color: COLORS.dark }}>{locationName}</Text>
                    </Text>
                    <View style={styles.timeBadge}>
                        <Icon name="access-time" size={16} color={COLORS.mediumGray} style={{ marginRight: 4 }} />
                        <Text style={styles.timeText}>{arrivalTime}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.closeBtnText}>Done</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

            {/* Full-screen Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                onMapReady={() => setIsMapReady(true)}
                customMapStyle={mapStyle}
            >
                {/* Bus Marker */}
                {/* Bus Marker - Hide if trip completed (Dropped) */}
                {displayLocation.latitude !== DEFAULT_LATITUDE && !isDropped && (
                    <Marker
                        coordinate={displayLocation}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat
                    >
                        <View style={styles.busMarkerContainer}>
                            <View style={styles.busMarkerPulse} />
                            <View style={styles.busMarker}>
                                <Icon name="directions-bus" size={22} color={COLORS.surface} />
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Student Stop Marker (Show for Evening as Drop, Morning as Pickup) */}
                {selectedChild?.pickup_latitude && selectedChild?.pickup_longitude && (
                    <Marker
                        coordinate={{
                            latitude: Number(selectedChild.pickup_latitude),
                            longitude: Number(selectedChild.pickup_longitude),
                        }}
                        anchor={{ x: 0.5, y: 1 }}
                        title={activeTrip?.trip_type === 'morning' ? 'Pickup Point' : 'Drop Point'}
                    >
                        <View style={styles.stopMarker}>
                            <Icon name="place" size={28} color={COLORS.secondary} />
                        </View>
                    </Marker>
                )}

                {/* School Marker (Destination for Morning) */}
                {activeTrip?.trip_type === 'morning' && selectedChild?.school_latitude && selectedChild?.school_longitude && (
                    <Marker
                        coordinate={{
                            latitude: Number(selectedChild.school_latitude),
                            longitude: Number(selectedChild.school_longitude),
                        }}
                        anchor={{ x: 0.5, y: 1 }}
                        title="School"
                    >
                        <View style={styles.schoolMarker}>
                            <Icon name="school" size={24} color={COLORS.surface} />
                        </View>
                    </Marker>
                )}

                {/* Route Polyline - Hide if trip completed */}
                {mapPolylineCoords.length > 0 && !isDropped && (
                    <Polyline
                        coordinates={mapPolylineCoords}
                        strokeColor={COLORS.primary}
                        strokeWidth={5}
                    />
                )}
            </MapView>

            {/* Top Header Overlay */}
            <SafeAreaView style={styles.topOverlay}>
                {/* Child Selector Dropdown Button */}
                <View style={styles.childSelectorContainer}>
                    <TouchableOpacity
                        style={styles.childSelectorButton}
                        onPress={() => setIsChildDropdownOpen(!isChildDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <Avatar
                            source={selectedChild?.photo}
                            name={selectedChild?.full_name || 'Child'}
                            size="small"
                        />
                        <Text style={styles.childSelectorName} numberOfLines={1}>
                            {selectedChild?.first_name || selectedChild?.full_name?.split(' ')[0] || 'Select Child'}
                        </Text>
                        <Icon
                            name={isChildDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={22}
                            color={COLORS.dark}
                        />
                    </TouchableOpacity>

                    {/* Dropdown Menu */}
                    {isChildDropdownOpen && children.length >= 1 && (
                        <View style={styles.childDropdown}>
                            {children.map((child) => {
                                const isSelected = child.id === studentId;
                                return (
                                    <TouchableOpacity
                                        key={child.id}
                                        style={[
                                            styles.childDropdownItem,
                                            isSelected && styles.childDropdownItemSelected,
                                        ]}
                                        onPress={() => {
                                            handleChildSelect(child.id);
                                            setIsChildDropdownOpen(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Avatar
                                            source={child.photo}
                                            name={child.full_name}
                                            size="small"
                                        />
                                        <Text
                                            style={[
                                                styles.childDropdownText,
                                                isSelected && styles.childDropdownTextSelected,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {child.first_name || child.full_name.split(' ')[0]}
                                        </Text>
                                        {isSelected && (
                                            <Icon name="check" size={16} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </SafeAreaView>

            {/* Map Controls */}
            <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapControlBtn} onPress={handleCenterMap}>
                    <Icon name="my-location" size={22} color={COLORS.dark} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.mapControlBtn, isFetchingTrip && styles.mapControlBtnActive]}
                    onPress={() => refetchTrip()}
                >
                    <Icon name="refresh" size={22} color={isFetchingTrip ? COLORS.primary : COLORS.dark} />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet or Trip Completed Card */}
            {isDropped ? (
                renderTripCompletedCard()
            ) : (
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        styles.bottomSheet,
                        {
                            transform: [{
                                translateY: bottomSheetTranslateY,
                            }],
                        },
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                        <Text style={styles.dragHint}>
                            {isBottomSheetExpanded ? 'Swipe down to minimize' : 'Swipe up for details'}
                        </Text>
                    </View>

                    {/* Live Status Indicator with Assigned Stop */}
                    <View style={styles.statusBar}>
                        <View style={styles.statusIndicator}>
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: isConnected ? COLORS.success : COLORS.warning },
                                ]}
                            />
                            <Text style={styles.statusText}>
                                {isConnected ? 'Live' : 'Connecting...'}
                            </Text>
                        </View>
                        {/* Assigned Stop - inline */}
                        {selectedChild && (
                            <View style={styles.assignedStopInline}>
                                <Icon name="place" size={14} color={COLORS.secondary} />
                                <Text style={styles.assignedStopText} numberOfLines={1}>
                                    {selectedChild?.stop_name || selectedChild?.pickup_address || 'Assigned Stop'}
                                </Text>
                            </View>
                        )}
                        {!!liveLocation?.speed && liveLocation.speed > 0 && (
                            <View style={styles.speedBadge}>
                                <Text style={styles.speedText}>{Math.round(liveLocation.speed)} km/h</Text>
                            </View>
                        )}
                    </View>

                    {/* Trip Details */}
                    {activeTrip ? (
                        <View style={styles.tripInfo}>
                            {/* Trip Header */}
                            <View style={styles.tripHeader}>
                                <View style={styles.tripMeta}>
                                    <View style={styles.tripTypeBadge}>
                                        <Icon
                                            name={activeTrip.trip_type === 'morning' ? 'wb-sunny' : 'nights-stay'}
                                            size={14}
                                            color={COLORS.primary}
                                        />
                                        <Text style={styles.tripTypeText}>
                                            {activeTrip.trip_type === 'morning' ? 'Morning Pickup' : 'Evening Drop'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.busInfoCompact}>
                                    <Text style={styles.busNumberLabel}>BUS</Text>
                                    <Text style={styles.busNumber}>{activeTrip.bus_number}</Text>
                                </View>
                            </View>

                            {/* Next Stop Highlight */}
                            <View style={styles.nextStopHighlight}>
                                <Icon name="navigation" size={18} color={COLORS.surface} />
                                <Text style={styles.nextStopHighlightText} numberOfLines={1}>
                                    {liveLocation?.next_stop
                                        ? `Next: ${liveLocation.next_stop.name} (${liveLocation.next_stop.distance_km}km)`
                                        : 'Next: En route'}
                                </Text>
                            </View>

                            {/* Vehicle & Trip Info Cards */}
                            <View style={styles.infoCardsRow}>
                                <View style={[styles.infoCard, styles.infoCardHighlight]}>
                                    <Text style={styles.infoCardLabel}>STATUS</Text>
                                    <Text style={[styles.infoCardValue, { color: COLORS.success }]}>
                                        {activeTrip?.status === 'in_progress' ? 'LIVE' : activeTrip?.status || 'Active'}
                                    </Text>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoCardLabel}>SPEED</Text>
                                    <Text style={styles.infoCardValue}>
                                        {Math.round(liveLocation?.speed || 0)} km/h
                                    </Text>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoCardLabel}>DISTANCE</Text>
                                    <Text style={styles.infoCardValue}>{distanceRemaining || '--'}</Text>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoCardLabel}>ETA</Text>
                                    <Text style={styles.infoCardValue}>{eta || '--'}</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.noTripState}>
                            <Icon name="directions-bus" size={48} color={COLORS.lightGray} />
                            <Text style={styles.noTripTitle}>No Active Trip</Text>
                            <Text style={styles.noTripSubtitle}>
                                {selectedChild?.first_name}'s bus is not currently running
                            </Text>
                        </View>
                    )
                    }
                </Animated.View >
            )}
        </View >
    );
};



// Custom map styling for a cleaner look
const mapStyle = [
    {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
    },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 16,
        zIndex: 10,
        marginTop: Platform.OS === 'ios' ? 50 : 16,
    },
    childSelectorCard: {
        backgroundColor: COLORS.surface,
        marginHorizontal: 16,
        marginTop: Platform.OS === 'ios' ? 50 : 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    // New Dropdown Selector Styles
    childSelectorContainer: {
        position: 'relative',
        zIndex: 100,
    },
    childSelectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 28,
        backgroundColor: COLORS.surface,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    childSelectorName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.dark,
        maxWidth: 120,
    },
    childDropdown: {
        position: 'absolute',
        top: 54,
        left: 0,
        minWidth: 160,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 1000,
    },
    childDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
    },
    childDropdownItemSelected: {
        backgroundColor: COLORS.primaryLight + '15',
    },
    childDropdownText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.dark,
    },
    childDropdownTextSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    mapControls: {
        position: 'absolute',
        right: 16,
        top: Platform.OS === 'ios' ? 140 : 100,
        gap: 10,
        zIndex: 10,
    },
    mapControlBtn: {
        width: 44,
        height: 44,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    mapControlBtnActive: {
        backgroundColor: COLORS.primaryLight + '20',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: 300, // BOTTOM_SHEET_MAX_HEIGHT
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 16,
        paddingBottom: 20, // Minimal padding
    },
    dragHandleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    dragHandle: {
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: COLORS.border,
    },
    dragHint: {
        fontSize: 10,
        color: COLORS.lightGray,
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.mediumGray,
        textAlign: 'center',
        marginTop: 8,
    },
    // Completed Trip Styles
    completedCard: {
        backgroundColor: COLORS.white,
        width: '90%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        // Shadow removed as per request for cleaner look
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    completedIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.success + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    completedTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.dark,
        marginBottom: 8,
        textAlign: 'center',
    },
    completionDetails: {
        alignItems: 'center',
        marginBottom: 32,
        width: '100%',
    },
    studentNameLarge: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 4,
        textAlign: 'center',
    },
    arrivalText: {
        fontSize: 15,
        color: COLORS.mediumGray,
        textAlign: 'center',
        marginBottom: 12,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.mediumGray,
    },
    closeBtn: {
        backgroundColor: COLORS.dark,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    // Status Bar in Bottom Sheet
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    },
    assignedStopInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    assignedStopText: {
        fontSize: 12,
        color: COLORS.mediumGray,
        fontWeight: '500',
        maxWidth: 120,
    },
    speedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: COLORS.primaryLight + '15',
        borderRadius: 8,
    },
    speedText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    // Trip Details
    tripInfo: {
        padding: 20,
        gap: 16,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tripMeta: {
        gap: 4,
    },
    tripTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.primaryLight + '10',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tripTypeText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    busInfoCompact: {
        alignItems: 'flex-end',
    },
    busNumberLabel: {
        fontSize: 10,
        color: COLORS.lightGray,
        fontWeight: '600',
        letterSpacing: 1,
    },
    busNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.dark,
    },
    nextStopHighlight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.dark,
        padding: 12,
        borderRadius: 12,
    },
    nextStopHighlightText: {
        color: COLORS.surface,
        fontSize: 14,
        fontWeight: '500',
    },
    infoCardsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 12,
        gap: 4,
    },
    infoCardHighlight: {
        backgroundColor: COLORS.successLight + '40',
        borderWidth: 1,
        borderColor: COLORS.successLight,
    },
    infoCardLabel: {
        fontSize: 10,
        color: COLORS.lightGray,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    infoCardValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.dark,
    },
    // No Trip State
    noTripState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 12,
    },
    noTripTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.dark,
    },
    noTripSubtitle: {
        fontSize: 14,
        color: COLORS.mediumGray,
        textAlign: 'center',
    },
    // Markers
    busMarkerContainer: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    busMarkerPulse: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary + '40',
        transform: [{ scale: 1 }],
    },
    busMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    stopMarker: {
        backgroundColor: COLORS.surface,
        padding: 4,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    schoolMarker: {
        backgroundColor: COLORS.primary,
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});

export default TrackingScreen;
