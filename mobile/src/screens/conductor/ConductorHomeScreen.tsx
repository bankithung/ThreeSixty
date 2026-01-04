/**
 * Conductor Home Screen - Professional Minimalist Dashboard
 * Clean, muted colors with elegant typography
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Alert,
    TouchableOpacity,
    useWindowDimensions,
    StatusBar,
    ScrollView,
} from 'react-native';

import { ConductorScreenProps } from '../../types/navigation';
import { useAppDispatch, useAppSelector, useLocation } from '../../hooks';
import { setCurrentTrip } from '../../store/slices/tripSlice';
import {
    useGetActiveTripsQuery,
    useGetRoutesQuery,
    useGetBusesQuery,
    useStartTripMutation,
    useEndTripMutation,
    useUpdateLocationMutation,
    useGetTripAttendanceQuery,
} from '../../store/api';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Avatar, SwipeButton } from '../../components/common';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Professional muted color palette
const COLORS = {
    dark: '#1a1a2e',
    darkGray: '#2d2d44',
    mediumGray: '#4a4a68',
    lightGray: '#8a8aa3',
    surface: '#f8f9fa',
    white: '#ffffff',
    accent: '#4f46e5',
    accentLight: '#6366f1',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    border: '#e5e7eb',
};

const ConductorHomeScreen: React.FC<ConductorScreenProps<'ConductorHome'>> = ({
    navigation,
}) => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { currentTrip } = useAppSelector((state) => state.trip);
    const { height: screenHeight } = useWindowDimensions();

    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
    const [endedTripId, setEndedTripId] = useState<string | null>(null);

    // RTK Query hooks
    const { data: activeTrips = [] } = useGetActiveTripsQuery(undefined, {
        pollingInterval: 30000,
    });

    const { data: routes = [] } = useGetRoutesQuery(undefined);
    const { data: buses = [] } = useGetBusesQuery(undefined);

    const { data: attendanceData } = useGetTripAttendanceQuery(currentTrip?.id!, {
        skip: !currentTrip?.id,
        pollingInterval: 10000,
    });

    const [startTripMutation] = useStartTripMutation();
    const [endTripMutation] = useEndTripMutation();
    const [updateLocation] = useUpdateLocationMutation();

    const { startTracking, stopTracking } = useLocation({
        interval: 5000,
        onUpdate: (loc) => {
            if (currentTrip?.id) {
                updateLocation({
                    tripId: currentTrip.id,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    speed: loc.speed || undefined,
                    heading: loc.heading || undefined,
                });
            }
        },
    });

    useEffect(() => {
        const myTrip = activeTrips.find((t) =>
            (t.conductor === user?.id || t.driver === user?.id) && t.id !== endedTripId
        );
        if (myTrip && !currentTrip) {
            dispatch(setCurrentTrip(myTrip));
        }
    }, [activeTrips, user, dispatch, currentTrip, endedTripId]);

    useEffect(() => {
        if (currentTrip && currentTrip.status === 'in_progress') {
            startTracking();
        } else {
            stopTracking();
        }
        return () => stopTracking();
    }, [currentTrip?.status]);

    useEffect(() => {
        if (routes.length > 0 && !selectedRouteId) {
            setSelectedRouteId(routes[0].id);
        }
        if (buses.length > 0 && !selectedBusId) {
            setSelectedBusId(buses[0].id);
        }
    }, [routes, buses]);

    const handleStartTrip = useCallback(async () => {
        if (!selectedBusId || !selectedRouteId) {
            Alert.alert('Error', 'Please select a bus and route');
            return;
        }

        try {
            const trip = await startTripMutation({
                busId: selectedBusId,
                routeId: selectedRouteId,
                tripType,
            }).unwrap();
            dispatch(setCurrentTrip(trip));
        } catch (error: any) {
            Alert.alert('Error', error?.data?.detail || 'Failed to start trip');
        }
    }, [selectedBusId, selectedRouteId, tripType, startTripMutation, dispatch]);

    const handleEndTrip = useCallback(async () => {
        if (currentTrip) {
            try {
                const tripId = currentTrip.id;
                const trip = await endTripMutation(tripId).unwrap();
                setEndedTripId(tripId);
                navigation.navigate('TripSummary', { tripId: trip.id });
                dispatch(setCurrentTrip(null));
            } catch (error: any) {
                Alert.alert('Error', error?.data?.detail || 'Failed to end trip');
            }
        }
    }, [currentTrip, endTripMutation, navigation, dispatch]);

    const handleScanFace = useCallback((eventType: 'checkin' | 'checkout') => {
        if (currentTrip) {
            navigation.navigate('FaceScan', { tripId: currentTrip.id, eventType });
        }
    }, [currentTrip, navigation]);

    const handleViewStudents = useCallback(() => {
        if (currentTrip) {
            navigation.navigate('StudentList', { tripId: currentTrip.id });
        }
    }, [currentTrip, navigation]);

    const stats = {
        total: attendanceData?.total_students || currentTrip?.total_students || 0,
        boarded: attendanceData?.checked_in_count || currentTrip?.students_boarded || 0,
        dropped: attendanceData?.checked_out_count || currentTrip?.students_dropped || 0,
    };

    const completionPercent = stats.total > 0 ? Math.round((stats.dropped / stats.total) * 100) : 0;
    const isActiveTrip = currentTrip && currentTrip.status !== 'completed';

    // Render Active Trip UI - Professional Minimalist Design
    const renderActiveTripUI = () => (
        <Animated.View entering={FadeIn} style={styles.activeTripContainer}>
            {/* Status Bar */}
            <View style={styles.statusBar}>
                <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveLabel}>TRIP ACTIVE</Text>
                </View>
                <Text style={styles.tripType}>
                    {currentTrip?.trip_type === 'morning' ? 'Morning Pickup' : 'Evening Drop'}
                </Text>
            </View>

            {/* Trip Details Card */}
            <View style={styles.tripCard}>
                <View style={styles.tripCardHeader}>
                    <View style={styles.busInfo}>
                        <Text style={styles.busLabel}>BUS</Text>
                        <Text style={styles.busNumber}>{currentTrip?.bus_number}</Text>
                    </View>
                    <View style={styles.dividerVertical} />
                    <View style={styles.routeInfo}>
                        <Text style={styles.routeLabel}>ROUTE</Text>
                        <Text style={styles.routeName}>{currentTrip?.route_name}</Text>
                    </View>
                </View>

                {/* Progress Section */}
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>Trip Progress</Text>
                        <Text style={styles.progressPercent}>{completionPercent}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={[styles.statItem, styles.statItemMiddle]}>
                        <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.boarded}</Text>
                        <Text style={styles.statLabel}>Boarded</Text>
                    </View>
                    <View style={[styles.statItem, styles.statItemMiddle]}>
                        <Text style={[styles.statValue, { color: COLORS.accent }]}>{stats.dropped}</Text>
                        <Text style={styles.statLabel}>Dropped</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.total - stats.dropped}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() => handleScanFace('checkin')}
                    activeOpacity={0.8}
                >
                    <View style={styles.actionIconWrapper}>
                        <Icon name="camera-alt" size={22} color={COLORS.white} />
                    </View>
                    <View style={styles.actionTextWrapper}>
                        <Text style={styles.actionTitle}>Check In</Text>
                        <Text style={styles.actionSubtitle}>Scan to board student</Text>
                    </View>
                    <Icon name="arrow-forward" size={20} color={COLORS.white} style={{ opacity: 0.7 }} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.primaryAction, { backgroundColor: COLORS.darkGray }]}
                    onPress={() => handleScanFace('checkout')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.actionIconWrapper, { backgroundColor: COLORS.mediumGray }]}>
                        <Icon name="logout" size={22} color={COLORS.white} />
                    </View>
                    <View style={styles.actionTextWrapper}>
                        <Text style={styles.actionTitle}>Check Out</Text>
                        <Text style={styles.actionSubtitle}>Scan to drop student</Text>
                    </View>
                    <Icon name="arrow-forward" size={20} color={COLORS.white} style={{ opacity: 0.7 }} />
                </TouchableOpacity>
            </View>

            {/* Secondary Links */}
            <View style={styles.linksRow}>
                <TouchableOpacity style={styles.linkButton} onPress={handleViewStudents}>
                    <Icon name="list" size={18} color={COLORS.mediumGray} />
                    <Text style={styles.linkText}>Student List</Text>
                </TouchableOpacity>

                <View style={styles.linkDivider} />

                <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('SOS', {})}>
                    <Icon name="warning" size={18} color={COLORS.error} />
                    <Text style={[styles.linkText, { color: COLORS.error }]}>Emergency</Text>
                </TouchableOpacity>
            </View>

            {/* End Trip */}
            <View style={styles.endTripContainer}>
                <SwipeButton
                    title="Slide to End Trip"
                    onSwipeComplete={handleEndTrip}
                    color={COLORS.error}
                    backgroundColor={'#fef2f2'}
                    iconName="stop"
                />
            </View>
        </Animated.View>
    );

    // Render Start Trip UI - Compact layout that fits on screen
    const renderStartTripUI = () => (
        <Animated.View entering={FadeInDown} style={styles.startTripContainer}>
            {/* Trip Config Card */}
            <View style={styles.startCard}>
                {/* Trip Type - Compact Toggle */}
                <View style={styles.compactRow}>
                    <Text style={styles.compactLabel}>Type</Text>
                    <View style={styles.compactToggle}>
                        <TouchableOpacity
                            style={[styles.miniToggle, tripType === 'morning' && styles.miniToggleActive]}
                            onPress={() => setTripType('morning')}
                        >
                            <Icon name="wb-sunny" size={14} color={tripType === 'morning' ? COLORS.white : COLORS.mediumGray} />
                            <Text style={[styles.miniToggleText, tripType === 'morning' && styles.miniToggleTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.miniToggle, tripType === 'evening' && styles.miniToggleActive]}
                            onPress={() => setTripType('evening')}
                        >
                            <Icon name="nights-stay" size={14} color={tripType === 'evening' ? COLORS.white : COLORS.mediumGray} />
                            <Text style={[styles.miniToggleText, tripType === 'evening' && styles.miniToggleTextActive]}>PM</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Route Selection */}
                <View style={styles.compactRow}>
                    <Text style={styles.compactLabel}>Route</Text>
                    <View style={styles.compactChips}>
                        {routes.slice(0, 3).map((route) => (
                            <TouchableOpacity
                                key={route.id}
                                style={[styles.miniChip, selectedRouteId === route.id && styles.miniChipActive]}
                                onPress={() => setSelectedRouteId(route.id)}
                            >
                                <Text style={[styles.miniChipText, selectedRouteId === route.id && styles.miniChipTextActive]} numberOfLines={1}>
                                    {route.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Bus Selection */}
                <View style={styles.compactRow}>
                    <Text style={styles.compactLabel}>Bus</Text>
                    <View style={styles.compactChips}>
                        {buses.slice(0, 4).map((bus) => (
                            <TouchableOpacity
                                key={bus.id}
                                style={[styles.miniChip, selectedBusId === bus.id && styles.miniChipActive]}
                                onPress={() => setSelectedBusId(bus.id)}
                            >
                                <Text style={[styles.miniChipText, selectedBusId === bus.id && styles.miniChipTextActive]}>
                                    {bus.number}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            {/* Swipe Button */}
            <View style={styles.startSwipeContainer}>
                <SwipeButton
                    title="Slide to Start Trip"
                    onSwipeComplete={handleStartTrip}
                    color={COLORS.dark}
                    backgroundColor={COLORS.white}
                    iconName="play-arrow"
                    enabled={!!selectedBusId && !!selectedRouteId}
                />
            </View>

            {/* Quick Actions - Row */}
            <View style={styles.quickActionsRow}>
                <TouchableOpacity style={styles.darkActionBtn} onPress={() => navigation.navigate('Profile')}>
                    <Icon name="person" size={20} color={COLORS.white} />
                    <Text style={styles.darkActionBtnText}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.darkActionBtn} onPress={() => navigation.navigate('Reports')}>
                    <Icon name="assessment" size={20} color={COLORS.white} />
                    <Text style={styles.darkActionBtnText}>Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.darkActionBtn, styles.sosActionBtn]} onPress={() => navigation.navigate('SOS', {})}>
                    <Icon name="warning" size={20} color={COLORS.white} />
                    <Text style={styles.darkActionBtnText}>SOS</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.first_name}</Text>
                    <Text style={styles.subtitle}>
                        {isActiveTrip ? 'Manage your active trip' : 'Ready to start?'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
                    <Avatar source={user?.avatar} name={user?.full_name || ''} size="small" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.scrollView}>
                <View style={styles.scrollContent}>
                    {isActiveTrip ? renderActiveTripUI() : renderStartTripUI()}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.surface,
    },
    header: {
        backgroundColor: COLORS.dark,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 22,
        fontWeight: '600',
        color: COLORS.white,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.lightGray,
        marginTop: 2,
    },
    avatarBtn: {
        padding: 2,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.mediumGray,
    },
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.dark,
    },
    scrollContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 16,
        paddingTop: 20,
        paddingBottom: 24,
        minHeight: '100%',
    },

    // Active Trip Styles
    activeTripContainer: {
        flex: 1,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
    },
    liveLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.success,
        letterSpacing: 0.5,
    },
    tripType: {
        fontSize: 12,
        color: COLORS.lightGray,
        fontWeight: '500',
    },
    tripCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    tripCardHeader: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    busInfo: {
        flex: 1,
    },
    busLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.lightGray,
        letterSpacing: 1,
        marginBottom: 4,
    },
    busNumber: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.dark,
        letterSpacing: -0.5,
    },
    dividerVertical: {
        width: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 20,
    },
    routeInfo: {
        flex: 1,
    },
    routeLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.lightGray,
        letterSpacing: 1,
        marginBottom: 4,
    },
    routeName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
    },
    progressSection: {
        marginBottom: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.mediumGray,
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.dark,
    },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.surface,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.dark,
        borderRadius: 3,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statItemMiddle: {
        borderLeftWidth: 1,
        borderLeftColor: COLORS.border,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.dark,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.lightGray,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    actionsContainer: {
        gap: 10,
        marginBottom: 16,
    },
    primaryAction: {
        backgroundColor: COLORS.dark,
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.mediumGray,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    actionTextWrapper: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    actionSubtitle: {
        fontSize: 12,
        color: COLORS.lightGray,
        marginTop: 2,
    },
    linksRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 4,
        marginBottom: 10,
    },
    linkButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    linkDivider: {
        width: 1,
        backgroundColor: COLORS.border,
        marginVertical: 8,
    },
    linkText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.mediumGray,
    },
    endTripContainer: {
        marginTop: 8,
    },

    // Start Trip Styles
    startTripContainer: {
        flex: 1,
    },
    startCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    startTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.dark,
        letterSpacing: -0.3,
    },
    startSubtitle: {
        fontSize: 13,
        color: COLORS.lightGray,
        marginTop: 4,
        marginBottom: 24,
    },
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.lightGray,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 4,
    },
    toggleOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    toggleOptionActive: {
        backgroundColor: COLORS.dark,
    },
    toggleLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.lightGray,
    },
    toggleLabelActive: {
        color: COLORS.white,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipActive: {
        backgroundColor: COLORS.dark,
        borderColor: COLORS.dark,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.mediumGray,
    },
    chipTextActive: {
        color: COLORS.white,
    },
    startSwipeContainer: {
        marginTop: 12,
    },

    // Compact Row Styles for Start Trip
    compactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    compactLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.mediumGray,
        width: 50,
    },
    compactToggle: {
        flexDirection: 'row',
        flex: 1,
        gap: 8,
    },
    miniToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: COLORS.surface,
        gap: 6,
    },
    miniToggleActive: {
        backgroundColor: COLORS.dark,
    },
    miniToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.mediumGray,
    },
    miniToggleTextActive: {
        color: COLORS.white,
    },
    compactChips: {
        flexDirection: 'row',
        flex: 1,
        gap: 6,
    },
    miniChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    miniChipActive: {
        backgroundColor: COLORS.dark,
        borderColor: COLORS.dark,
    },
    miniChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.mediumGray,
    },
    miniChipTextActive: {
        color: COLORS.white,
    },

    // Quick Actions Row - Dark Buttons
    quickActionsRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 8,
    },
    darkActionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.darkGray,
        borderRadius: 12,
        paddingVertical: 14,
        gap: 6,
    },
    darkActionBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.white,
    },
    sosActionBtn: {
        backgroundColor: COLORS.error,
    },
});

export default ConductorHomeScreen;
