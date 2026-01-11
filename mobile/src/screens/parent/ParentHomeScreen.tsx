/**
 * Parent Home Screen - Professional Minimalist Dashboard
 * Matching Conductor Dashboard design patterns
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    useWindowDimensions,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { ParentScreenProps } from '../../types/navigation';
import { useGetChildrenQuery, useGetChildStatusQuery, useGetUnreadCountQuery } from '../../store/api';
import { useAuth } from '../../hooks';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Avatar, LoadingSpinner } from '../../components/common';
import { Student } from '../../types/models';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Professional muted color palette - matching Conductor
const COLORS = {
    dark: '#1a1a2e',
    darkGray: '#2d2d44',
    mediumGray: '#4a4a68',
    lightGray: '#8a8aa3',
    surface: '#f8f9fa',
    white: '#ffffff',
    accent: '#4f46e5',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    border: '#e5e7eb',
};

// Recursive component to calculate total 'On Bus' status
const LiveRouteCount: React.FC<{ childrenList: Student[], index?: number, count?: number }> = ({ childrenList, index = 0, count = 0 }) => {
    // Base case: if we've checked all children, render the final count
    if (index >= childrenList.length) {
        return <>{count}</>;
    }

    const child = childrenList[index];
    // Hook call is stable because index increments predictably
    const { data: status } = useGetChildStatusQuery(child.id);
    const isOnBus = status?.status === 'on_bus';

    return (
        <LiveRouteCount
            childrenList={childrenList}
            index={index + 1}
            count={count + (isOnBus ? 1 : 0)}
        />
    );
};

// Wrapper for the stat value
const RouteStat: React.FC<{ childrenList: Student[] }> = ({ childrenList }) => {
    return (
        <Text style={[styles.statValue, { color: COLORS.success }]}>
            {childrenList.length > 0 ? <LiveRouteCount childrenList={childrenList} /> : 0}
        </Text>
    );
};

// Compact Child Card for horizontal scroll
const CompactChildCard: React.FC<{
    child: Student;
    onPress: () => void;
    onTrack: () => void;
}> = ({ child, onPress, onTrack }) => {
    const { data: status, isLoading } = useGetChildStatusQuery(child.id);

    const getStatusInfo = () => {
        if (!status) return { text: '...', color: COLORS.mediumGray, bg: '#f3f4f6' };

        // Check if student has already completed (dropped) the CURRENT active trip
        const isDroppedFromActiveTrip = status.active_trip_id && status.today_records?.some(
            (r: any) => r.trip === status.active_trip_id && r.event_type === 'checkout'
        );

        // If there is an active trip, and we are NOT on it AND NOT dropped from it yet -> Bus Arriving
        if (status.active_trip_id && status.status !== 'on_bus' && !isDroppedFromActiveTrip) {
            return { text: 'Bus En Route', color: '#ffffff', bg: COLORS.accent };
        }

        switch (status.status) {
            case 'on_bus': return { text: 'On Bus', color: '#ffffff', bg: COLORS.success };
            case 'dropped':
                // Check latest record to decide text
                const lastRecord = status.today_records?.[status.today_records.length - 1];
                const isSchoolDrop = lastRecord?.trip_type === 'morning';
                return {
                    text: isSchoolDrop ? 'At School' : 'At Home',
                    color: '#ffffff',
                    bg: COLORS.dark
                };
            default: return { text: 'Waiting', color: '#ffffff', bg: COLORS.warning };
        }
    };

    const statusInfo = getStatusInfo();
    const childName = child.full_name || `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Unknown';
    const firstName = child.first_name || childName.split(' ')[0];

    return (
        <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
            {/* Avatar with status banner */}
            <View style={styles.avatarWrapper}>
                <Avatar source={child.photo} name={childName} size="medium" />
                {/* LinkedIn-style status banner */}
                <View style={[styles.statusBanner, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusBannerText, { color: statusInfo.color }]}>
                        {statusInfo.text}
                    </Text>
                </View>
            </View>

            <Text style={styles.compactName} numberOfLines={1}>{firstName}</Text>
            <Text style={styles.compactGrade}>Grade {child.grade}</Text>

            {status?.active_trip_id && status?.status !== 'dropped' && (
                <TouchableOpacity style={styles.compactTrackBtn} onPress={(e) => { e.stopPropagation(); onTrack(); }}>
                    <Icon name="location-on" size={14} color={COLORS.white} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const ParentHomeScreen: React.FC<any> = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const { user } = useAuth();
    const { data: children = [], isLoading, refetch, isFetching } = useGetChildrenQuery();
    const { data: unreadData } = useGetUnreadCountQuery();
    const unreadCount = unreadData?.unread_count ?? 0;

    const handleChildPress = (studentId: string) => {
        navigation.navigate('ChildDetails', { studentId });
    };

    const handleTrackPress = (studentId: string) => {
        navigation.navigate('Track', { studentId });
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Dark Header - Matching Conductor */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.first_name || 'Parent'}</Text>
                    <Text style={styles.subtitle}>
                        {children.length > 0 ? `${children.length} child${children.length > 1 ? 'ren' : ''} registered` : 'No children yet'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Profile' as any)} style={styles.avatarBtn}>
                    <Avatar source={user?.avatar} name={user?.full_name || ''} size="small" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isFetching} onRefresh={refetch} />
                }
            >
                <Animated.View entering={FadeInDown}>
                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{children.length}</Text>
                            <Text style={styles.statLabel}>Children</Text>
                        </View>
                        <View style={styles.statCard}>
                            <RouteStat childrenList={children} />
                            <Text style={styles.statLabel}>On Route</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: unreadCount > 0 ? COLORS.error : COLORS.accent }]}>
                                {unreadCount}
                            </Text>
                            <Text style={styles.statLabel}>Alerts</Text>
                        </View>
                    </View>

                    {/* Children Section - Horizontal Scroll */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Children</Text>
                        {children.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Icon name="child-care" size={40} color={COLORS.lightGray} />
                                <Text style={styles.emptyTitle}>No Children Added</Text>
                                <Text style={styles.emptySubtitle}>Contact your school to link your children</Text>
                            </View>
                        ) : (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.childrenScroll}
                            >
                                {children.map((child: Student) => (
                                    <CompactChildCard
                                        key={child.id}
                                        child={child}
                                        onPress={() => handleChildPress(child.id)}
                                        onTrack={() => handleTrackPress(child.id)}
                                    />
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Quick Access Section */}
                    <View style={styles.quickAccessSection}>
                        <Text style={styles.sectionTitle}>Quick Access</Text>
                        <View style={styles.quickAccessCard}>
                            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('Track' as any)}>
                                <View style={[styles.quickAccessIcon, { backgroundColor: '#e0f2fe' }]}>
                                    <Icon name="location-on" size={20} color="#0284c7" />
                                </View>
                                <View style={styles.quickAccessInfo}>
                                    <Text style={styles.quickAccessTitle}>Track Bus</Text>
                                    <Text style={styles.quickAccessSubtitle}>Live location updates</Text>
                                </View>
                                <Icon name="chevron-right" size={20} color={COLORS.border} />
                            </TouchableOpacity>

                            <View style={styles.quickAccessDivider} />

                            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('Fees' as any)}>
                                <View style={[styles.quickAccessIcon, { backgroundColor: '#fef3c7' }]}>
                                    <Icon name="receipt-long" size={20} color="#d97706" />
                                </View>
                                <View style={styles.quickAccessInfo}>
                                    <Text style={styles.quickAccessTitle}>Fees & Payments</Text>
                                    <Text style={styles.quickAccessSubtitle}>View dues and history</Text>
                                </View>
                                <Icon name="chevron-right" size={20} color={COLORS.border} />
                            </TouchableOpacity>

                            <View style={styles.quickAccessDivider} />

                            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('Notifications' as any)}>
                                <View style={[styles.quickAccessIcon, { backgroundColor: '#fce7f3' }]}>
                                    <Icon name="notifications" size={20} color="#db2777" />
                                    {unreadCount > 0 && (
                                        <View style={styles.notifBadge}>
                                            <Text style={styles.notifBadgeText}>
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.quickAccessInfo}>
                                    <Text style={styles.quickAccessTitle}>Notifications</Text>
                                    <Text style={styles.quickAccessSubtitle}>
                                        {unreadCount > 0 ? `${unreadCount} unread` : 'Alerts and updates'}
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={20} color={COLORS.border} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
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
        paddingBottom: 32,
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        paddingTop: 20,
        paddingBottom: 32,
        minHeight: '100%',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.dark,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.lightGray,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 12,
        letterSpacing: -0.2,
    },
    childrenScroll: {
        paddingRight: 16,
        gap: 12,
    },
    compactCard: {
        width: 100,
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
    },
    avatarWrapper: {
        position: 'relative',
        alignItems: 'center',
    },
    statusBanner: {
        position: 'absolute',
        bottom: -4,
        left: -8,
        right: -8,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusBannerText: {
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    compactName: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.dark,
        marginTop: 12,
        textAlign: 'center',
    },
    compactGrade: {
        fontSize: 11,
        color: COLORS.lightGray,
        marginTop: 2,
    },
    compactTrackBtn: {
        marginTop: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.dark,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.dark,
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 13,
        color: COLORS.lightGray,
        marginTop: 4,
        textAlign: 'center',
    },
    quickAccessCard: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    quickAccessItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    quickAccessIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickAccessInfo: {
        flex: 1,
        marginLeft: 14,
    },
    quickAccessTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a2e',
    },
    quickAccessSubtitle: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    quickAccessSection: {
        marginBottom: 8,
    },
    quickAccessDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 16,
    },
    notifBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    notifBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#ffffff',
    },
});

export default ParentHomeScreen;
