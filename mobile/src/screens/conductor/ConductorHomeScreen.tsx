/**
 * Conductor Home Screen - Enhanced with RTK Query
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
    RefreshControl,
    TouchableOpacity,
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
import { Button, Card, LoadingSpinner, Avatar, SwipeButton } from '../../components/common';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

const ConductorHomeScreen: React.FC<ConductorScreenProps<'ConductorHome'>> = ({
    navigation,
}) => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { currentTrip } = useAppSelector((state) => state.trip);

    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
    const [endedTripId, setEndedTripId] = useState<string | null>(null);

    // RTK Query hooks
    const {
        data: activeTrips = [],
        refetch: refetchTrips,
        isFetching: isFetchingTrips,
    } = useGetActiveTripsQuery(undefined, {
        pollingInterval: 30000, // Poll every 30s
    });

    const { data: routes = [] } = useGetRoutesQuery(undefined);
    const { data: buses = [] } = useGetBusesQuery(undefined);

    const {
        data: attendanceData,
        refetch: refetchAttendance,
    } = useGetTripAttendanceQuery(currentTrip?.id!, {
        skip: !currentTrip?.id,
        pollingInterval: 10000,
    });

    const [startTripMutation, { isLoading: isStarting }] = useStartTripMutation();
    const [endTripMutation, { isLoading: isEnding }] = useEndTripMutation();
    const [updateLocation] = useUpdateLocationMutation();

    // Location tracking for conductors
    const { location, startTracking, stopTracking } = useLocation({
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

    // Check for my active trip on mount
    useEffect(() => {
        const myTrip = activeTrips.find((t) =>
            (t.conductor === user?.id || t.driver === user?.id) && t.id !== endedTripId
        );
        if (myTrip && !currentTrip) {
            dispatch(setCurrentTrip(myTrip));
        }
    }, [activeTrips, user, dispatch, currentTrip, endedTripId]);

    // Start location tracking when trip is active
    useEffect(() => {
        if (currentTrip && currentTrip.status === 'in_progress') {
            startTracking();
        } else {
            stopTracking();
        }
        return () => stopTracking();
    }, [currentTrip?.status]);

    // Auto-select first options
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
            Alert.alert('Success', 'Trip started successfully!');
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

    const handleRefresh = useCallback(() => {
        refetchTrips();
        if (currentTrip) {
            refetchAttendance();
        }
    }, [refetchTrips, refetchAttendance, currentTrip]);

    // Stats from attendance data
    const stats = {
        total: attendanceData?.total_students || currentTrip?.total_students || 0,
        boarded: attendanceData?.checked_in_count || currentTrip?.students_boarded || 0,
        dropped: attendanceData?.checked_out_count || currentTrip?.students_dropped || 0,
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetchingTrips}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.greeting}>Hello, {user?.first_name}!</Text>
                            <Icon name="waving-hand" size={24} color={colors.textPrimary} style={{ marginLeft: 8 }} />
                        </View>
                        <Text style={styles.subGreeting}>Conductor Dashboard</Text>
                    </View>
                    <Avatar source={user?.avatar} name={user?.full_name || ''} size="medium" />
                </View>

                {/* Active Trip Section */}
                {currentTrip && currentTrip.status !== 'completed' ? (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Active Trip</Text>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        </View>

                        <Card style={styles.tripCard}>
                            <View style={styles.tripHeader}>
                                <View>
                                    <Text style={styles.tripBus}>Bus {currentTrip.bus_number}</Text>
                                    <Text style={styles.tripRoute}>{currentTrip.route_name}</Text>
                                </View>
                                <View style={styles.tripBadge}>
                                    {currentTrip.trip_type === 'morning' ? (
                                        <Icon name="wb-sunny" size={16} color={colors.warning} />
                                    ) : (
                                        <Icon name="nights-stay" size={16} color={colors.primary} />
                                    )}
                                    <Text style={styles.tripBadgeText}>
                                        {currentTrip.trip_type === 'morning' ? ' Pickup' : ' Drop'}
                                    </Text>
                                </View>
                            </View>

                            {/* Stats Cards */}
                            <View style={styles.statsRow}>
                                <View style={styles.statCardContainer}>
                                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                                        <Text style={styles.statValue}>{stats.total}</Text>
                                        <Text style={styles.statLabel}>Total</Text>
                                    </View>
                                </View>
                                <View style={styles.statCardContainer}>
                                    <View style={[styles.statCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30', borderWidth: 1 }]}>
                                        <Text style={[styles.statValue, { color: colors.success }]}>
                                            {stats.boarded}
                                        </Text>
                                        <Text style={styles.statLabel}>Boarded</Text>
                                    </View>
                                </View>
                                <View style={styles.statCardContainer}>
                                    <View style={[styles.statCard, { backgroundColor: colors.info + '10', borderColor: colors.info + '30', borderWidth: 1 }]}>
                                        <Text style={[styles.statValue, { color: colors.info }]}>
                                            {stats.dropped}
                                        </Text>
                                        <Text style={styles.statLabel}>Dropped</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${stats.total > 0 ? (stats.dropped / stats.total) * 100 : 0}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {stats.total > 0
                                        ? `${Math.round((stats.dropped / stats.total) * 100)}% Trip Completion`
                                        : 'Waiting for attendance...'
                                    }
                                </Text>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.bigActionButton, { backgroundColor: colors.primary }]}
                                    onPress={() => handleScanFace('checkin')}
                                >
                                    <View style={styles.bigActionIcon}>
                                        <Icon name="camera-alt" size={32} color={colors.white} />
                                    </View>
                                    <Text style={styles.bigActionTitle}>Check In</Text>
                                    <Text style={styles.bigActionSubtitle}>Board Student</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.bigActionButton, { backgroundColor: colors.info }]}
                                    onPress={() => handleScanFace('checkout')}
                                >
                                    <View style={[styles.bigActionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <Icon name="logout" size={32} color={colors.white} />
                                    </View>
                                    <Text style={styles.bigActionTitle}>Check Out</Text>
                                    <Text style={styles.bigActionSubtitle}>Drop Student</Text>
                                </TouchableOpacity>
                            </View>

                            <Button
                                title="View Full Student List"
                                icon={<Icon name="assignment" size={20} color={colors.primary} />}
                                onPress={handleViewStudents}
                                variant="outline"
                                style={styles.fullButton}
                            />

                            <View style={styles.endTripContainer}>
                                <SwipeButton
                                    title="Slide to End Trip"
                                    onSwipeComplete={handleEndTrip}
                                    color={colors.error}
                                    backgroundColor={colors.error + '15'}
                                    iconName="stop"
                                />
                            </View>
                        </Card>
                    </View>
                ) : (
                    /* Start Trip Section */
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Start New Trip</Text>
                        <Card style={styles.startCard}>
                            {/* Trip Type */}
                            <Text style={styles.fieldLabel}>Trip Type</Text>
                            <View style={styles.toggleRow}>
                                <Button
                                    title="Morning Pickup"
                                    icon={<Icon name="wb-sunny" size={20} color={tripType === 'morning' ? colors.white : colors.primary} />}
                                    onPress={() => setTripType('morning')}
                                    variant={tripType === 'morning' ? 'primary' : 'outline'}
                                    size="small"
                                    style={styles.toggleButton}
                                />
                                <Button
                                    title="Evening Drop"
                                    icon={<Icon name="nights-stay" size={20} color={tripType === 'evening' ? colors.white : colors.primary} />}
                                    onPress={() => setTripType('evening')}
                                    variant={tripType === 'evening' ? 'primary' : 'outline'}
                                    size="small"
                                    style={styles.toggleButton}
                                />
                            </View>

                            {/* Route Selection */}
                            <Text style={styles.fieldLabel}>Select Route</Text>
                            <View style={styles.optionGrid}>
                                {routes.map((route) => (
                                    <Button
                                        key={route.id}
                                        title={route.name}
                                        onPress={() => setSelectedRouteId(route.id)}
                                        variant={selectedRouteId === route.id ? 'primary' : 'outline'}
                                        size="small"
                                        style={styles.optionButton}
                                    />
                                ))}
                            </View>

                            {/* Bus Selection */}
                            <Text style={styles.fieldLabel}>Select Bus</Text>
                            <View style={styles.optionGrid}>
                                {buses.map((bus) => (
                                    <Button
                                        key={bus.id}
                                        title={`${bus.number}`}
                                        onPress={() => setSelectedBusId(bus.id)}
                                        variant={selectedBusId === bus.id ? 'primary' : 'outline'}
                                        size="small"
                                        style={styles.optionButton}
                                    />
                                ))}
                            </View>

                            <View style={styles.startButtonContainer}>
                                <SwipeButton
                                    title="Slide to Start Trip"
                                    onSwipeComplete={handleStartTrip}
                                    color={colors.primary}
                                    backgroundColor={colors.primary + '15'}
                                    iconName="play-arrow"
                                    enabled={!!selectedBusId && !!selectedRouteId}
                                />
                            </View>
                        </Card>
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <Card style={styles.quickCard} onPress={() => navigation.navigate('Profile')}>
                            <View style={styles.quickIconContainer}>
                                <Icon name="person" size={28} color={colors.primary} />
                            </View>
                            <Text style={styles.quickText}>Profile</Text>
                        </Card>
                        <Card style={styles.quickCard}>
                            <View style={styles.quickIconContainer}>
                                <Icon name="analytics" size={28} color={colors.primary} />
                            </View>
                            <Text style={styles.quickText}>Reports</Text>
                        </Card>
                        <Card style={styles.quickCard}>
                            <View style={styles.quickIconContainer}>
                                <Icon name="warning" size={28} color={colors.error} />
                            </View>
                            <Text style={styles.quickText}>SOS</Text>
                        </Card>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    greeting: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    subGreeting: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '20',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.error,
    },
    liveText: {
        color: colors.error,
        fontWeight: '700',
        fontSize: 12,
    },
    tripCard: {
        padding: theme.spacing.lg,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.lg,
    },
    tripBus: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    tripRoute: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        marginTop: 4,
    },
    tripBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    tripBadgeText: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    tripStats: {
        marginBottom: theme.spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: -6,
        marginBottom: theme.spacing.lg,
    },
    statCardContainer: {
        flex: 1,
        paddingHorizontal: 6,
    },
    statCard: {
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.indigo50,
        minHeight: 80,
    },
    statValue: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    progressContainer: {
        marginBottom: theme.spacing.xl,
    },
    progressBar: {
        height: 6,
        backgroundColor: colors.indigo50,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.success,
        borderRadius: 3,
    },
    progressText: {
        fontSize: theme.typography.fontSize.xs,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: 6,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    bigActionButton: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    bigActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    bigActionTitle: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    bigActionSubtitle: {
        color: colors.white,
        fontSize: 12,
        opacity: 0.9,
    },
    fullButton: {
        marginBottom: theme.spacing.md,
        borderColor: colors.border,
    },
    endTripContainer: {
        marginTop: theme.spacing.sm,
    },
    startCard: {
        padding: theme.spacing.lg,
    },
    fieldLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    toggleButton: {
        flex: 1,
    },
    optionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    optionButton: {
        minWidth: 80,
    },
    startButtonContainer: {
        marginTop: theme.spacing.xl,
    },
    quickActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    quickCard: {
        flex: 1,
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: colors.surface,
    },
    quickIconContainer: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.indigo50,
        borderRadius: 24,
        marginBottom: theme.spacing.sm,
    },
    quickText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textPrimary,
        fontWeight: '600',
    },
});

export default ConductorHomeScreen;
