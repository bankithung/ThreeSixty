/**
 * Real-time Bus Tracking Screen - Like Zomato/Uber style
 */

import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Dimensions,
    Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ParentTabScreenProps } from '../../types/navigation';
import { useAppDispatch, useAppSelector, useWebSocket } from '../../hooks';
import { selectChild } from '../../store/slices/tripSlice';
import {
    useGetChildrenQuery,
    useGetChildTripQuery,
    useGetTripTrackingQuery,
} from '../../store/api';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, LoadingSpinner, Avatar, Button } from '../../components/common';
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from '../../constants/config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TrackingScreen: React.FC<ParentTabScreenProps<'Track'>> = ({
    route,
    navigation,
}) => {
    const dispatch = useAppDispatch();
    const { selectedChildId, liveLocation, wsConnected } = useAppSelector((state) => state.trip);
    const mapRef = React.useRef<MapView>(null);

    // Get student ID from route or use selected
    const studentId = route.params?.studentId || selectedChildId;

    // RTK Query hooks
    const { data: children = [] } = useGetChildrenQuery();

    const {
        data: childTripData,
        isLoading: isLoadingTrip,
        refetch: refetchTrip,
    } = useGetChildTripQuery(studentId!, {
        skip: !studentId,
        pollingInterval: wsConnected ? 0 : 10000, // Poll if WS not connected
    });

    const {
        data: trackingData,
    } = useGetTripTrackingQuery(childTripData?.trip?.id!, {
        skip: !childTripData?.trip?.id,
    });

    const selectedChild = useMemo(
        () => children.find((c) => c.id === studentId),
        [children, studentId]
    );

    const activeTrip = childTripData?.trip;

    // WebSocket for real-time updates
    const { isConnected } = useWebSocket({
        tripId: activeTrip?.id || null,
        onLocationUpdate: (location) => {
            // Animate map to new location
            mapRef.current?.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        },
    });

    const handleChildSelect = useCallback((childId: string) => {
        dispatch(selectChild(childId));
    }, [dispatch]);

    const handleCallDriver = useCallback(() => {
        const phone = trackingData?.staff?.driver?.phone;
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    }, [trackingData]);

    const handleCallConductor = useCallback(() => {
        const phone = trackingData?.staff?.conductor?.phone;
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    }, [trackingData]);

    // Get display location (live > latest from API > student location)
    const displayLocation = useMemo(() => {
        if (liveLocation) {
            return {
                latitude: liveLocation.latitude,
                longitude: liveLocation.longitude,
            };
        }
        if (childTripData?.latest_location) {
            return {
                latitude: childTripData.latest_location.latitude,
                longitude: childTripData.latest_location.longitude,
            };
        }
        if (selectedChild) {
            return {
                latitude: selectedChild.pickup_latitude,
                longitude: selectedChild.pickup_longitude,
            };
        }
        return { latitude: DEFAULT_LATITUDE, longitude: DEFAULT_LONGITUDE };
    }, [liveLocation, childTripData, selectedChild]);

    const initialRegion = {
        ...displayLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    };

    // No child selected state
    if (!selectedChild && children.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <LoadingSpinner fullScreen text="Loading..." />
            </SafeAreaView>
        );
    }

    if (!studentId) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.selectChild}>
                    <Text style={styles.selectTitle}>Select a Child</Text>
                    <Text style={styles.selectSubtitle}>Choose whose bus you want to track</Text>
                    {children.map((child) => (
                        <TouchableOpacity
                            key={child.id}
                            style={styles.childOption}
                            onPress={() => handleChildSelect(child.id)}
                        >
                            <Avatar source={child.photo} name={child.full_name} size="medium" />
                            <View style={styles.childInfo}>
                                <Text style={styles.childName}>{child.full_name}</Text>
                                <Text style={styles.childRoute}>{child.route_name || 'No route assigned'}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Child Selector (if multiple children) */}
            {children.length > 1 && (
                <View style={styles.childSelector}>
                    {children.map((child) => (
                        <TouchableOpacity
                            key={child.id}
                            style={[
                                styles.childChip,
                                child.id === studentId && styles.childChipSelected,
                            ]}
                            onPress={() => handleChildSelect(child.id)}
                        >
                            <Avatar source={child.photo} name={child.full_name} size="small" />
                            <Text
                                style={[
                                    styles.childChipText,
                                    child.id === studentId && styles.childChipTextSelected,
                                ]}
                            >
                                {child.first_name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={initialRegion}
                    showsUserLocation
                    showsMyLocationButton={false}
                >
                    {/* Bus Marker */}
                    {(liveLocation || childTripData?.latest_location) && (
                        <Marker
                            coordinate={displayLocation}
                            title="School Bus"
                            description={`Speed: ${liveLocation?.speed || childTripData?.latest_location?.speed || 0} km/h`}
                        >
                            <View style={styles.busMarker}>
                                <Icon name="directions-bus" size={24} color={colors.primary} />
                            </View>
                        </Marker>
                    )}

                    {/* Student Stop Marker */}
                    {selectedChild && (
                        <Marker
                            coordinate={{
                                latitude: selectedChild.pickup_latitude,
                                longitude: selectedChild.pickup_longitude,
                            }}
                            title={`${selectedChild.first_name}'s Stop`}
                            description={selectedChild.pickup_address}
                        >
                            <View style={styles.stopMarker}>
                                <Icon name="place" size={20} color={colors.secondary} />
                            </View>
                        </Marker>
                    )}

                    {/* Route Polyline */}
                    {trackingData?.route_polyline && (
                        <Polyline
                            coordinates={decodePolyline(trackingData.route_polyline)}
                            strokeColor={colors.primary}
                            strokeWidth={4}
                        />
                    )}
                </MapView>

                {/* Map Controls */}
                <View style={styles.mapControls}>
                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => {
                            mapRef.current?.animateToRegion({
                                ...displayLocation,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }, 500);
                        }}
                    >
                        <Icon name="my-location" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mapButton} onPress={() => refetchTrip()}>
                        <Icon name="refresh" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                {/* Connection Status */}
                <View style={styles.statusRow}>
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: isConnected ? colors.success : colors.warning },
                        ]}
                    />
                    <Text style={styles.statusText}>
                        {isConnected ? 'Live Tracking' : 'Updating...'}
                    </Text>
                    {liveLocation?.speed && (
                        <Text style={styles.speedText}>
                            {Math.round(liveLocation.speed)} km/h
                        </Text>
                    )}
                </View>

                {/* Trip Info */}
                {activeTrip ? (
                    <Card style={styles.tripCard}>
                        <View style={styles.tripRow}>
                            <View style={styles.tripInfo}>
                                <Text style={styles.tripLabel}>Bus</Text>
                                <Text style={styles.tripValue}>{activeTrip.bus_number}</Text>
                            </View>
                            <View style={styles.tripInfo}>
                                <Text style={styles.tripLabel}>Route</Text>
                                <Text style={styles.tripValue} numberOfLines={1}>
                                    {activeTrip.route_name}
                                </Text>
                            </View>
                            <View style={styles.tripInfo}>
                                <Text style={styles.tripLabel}>Type</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Icon
                                        name={activeTrip.trip_type === 'morning' ? 'wb-sunny' : 'nights-stay'}
                                        size={16}
                                        color={colors.primary}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={[styles.tripValue, { color: colors.primary }]}>
                                        {activeTrip.trip_type === 'morning' ? 'Pickup' : 'Drop'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Contact Staff */}
                        {(trackingData?.staff?.driver || trackingData?.staff?.conductor) && (
                            <View style={styles.staffSection}>
                                <Text style={styles.staffTitle}>Contact</Text>
                                <View style={styles.staffButtons}>
                                    {trackingData.staff.driver && (
                                        <TouchableOpacity
                                            style={styles.staffButton}
                                            onPress={handleCallDriver}
                                        >
                                            <Icon name="phone" size={16} color={colors.primary} style={{ marginRight: theme.spacing.sm }} />
                                            <Text style={styles.staffName}>
                                                {trackingData.staff.driver.name.split(' ')[0]}
                                            </Text>
                                            <Text style={styles.staffRole}>Driver</Text>
                                        </TouchableOpacity>
                                    )}
                                    {trackingData.staff.conductor && (
                                        <TouchableOpacity
                                            style={styles.staffButton}
                                            onPress={handleCallConductor}
                                        >
                                            <Icon name="phone" size={16} color={colors.primary} style={{ marginRight: theme.spacing.sm }} />
                                            <Text style={styles.staffName}>
                                                {trackingData.staff.conductor.name.split(' ')[0]}
                                            </Text>
                                            <Text style={styles.staffRole}>Conductor</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </Card>
                ) : (
                    <Card style={styles.noTripCard}>
                        <Icon name="directions-bus" size={40} color={colors.textHint} style={{ marginBottom: theme.spacing.sm }} />
                        <Text style={styles.noTripText}>No active trip</Text>
                        <Text style={styles.noTripSubtext}>
                            {selectedChild?.first_name}'s bus is not currently running
                        </Text>
                    </Card>
                )}
            </View>
        </SafeAreaView>
    );
};

// Decode Google polyline to coordinates
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
    const points: { latitude: number; longitude: number }[] = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let shift = 0, result = 0, byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += result & 1 ? ~(result >> 1) : result >> 1;

        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += result & 1 ? ~(result >> 1) : result >> 1;

        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    selectChild: {
        flex: 1,
        padding: theme.spacing.lg,
    },
    selectTitle: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    selectSubtitle: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    childOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    childInfo: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    childName: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    childRoute: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    childSelector: {
        flexDirection: 'row',
        padding: theme.spacing.sm,
        backgroundColor: colors.surface,
        gap: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    childChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        backgroundColor: colors.background,
        gap: theme.spacing.xs,
    },
    childChipSelected: {
        backgroundColor: colors.primary,
    },
    childChipText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    childChipTextSelected: {
        color: colors.white,
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    mapControls: {
        position: 'absolute',
        right: theme.spacing.md,
        top: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    mapButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.surface,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.md,
    },
    mapButtonText: {
        fontSize: 20,
    },
    busMarker: {
        backgroundColor: colors.white,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        borderWidth: 3,
        borderColor: colors.primary,
        ...theme.shadows.lg,
    },
    busMarkerText: {
        fontSize: 24,
    },
    stopMarker: {
        backgroundColor: colors.white,
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 2,
        borderColor: colors.secondary,
        ...theme.shadows.md,
    },
    stopMarkerText: {
        fontSize: 18,
    },
    bottomSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        ...theme.shadows.lg,
        maxHeight: SCREEN_HEIGHT * 0.35,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: theme.spacing.sm,
    },
    statusText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        flex: 1,
    },
    speedText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.primary,
        fontWeight: '600',
    },
    tripCard: {
        backgroundColor: colors.background,
        padding: theme.spacing.md,
    },
    tripRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    tripInfo: {
        flex: 1,
    },
    tripLabel: {
        fontSize: theme.typography.fontSize.xs,
        color: colors.textHint,
        marginBottom: 4,
    },
    tripValue: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    staffSection: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    staffTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    staffButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    staffButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    staffIcon: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    staffName: {
        flex: 1,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    staffRole: {
        fontSize: theme.typography.fontSize.xs,
        color: colors.textHint,
    },
    noTripCard: {
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: colors.background,
    },
    noTripIcon: {
        fontSize: 40,
        marginBottom: theme.spacing.sm,
    },
    noTripText: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    noTripSubtext: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textHint,
        textAlign: 'center',
        marginTop: theme.spacing.xs,
    },
});

export default TrackingScreen;
