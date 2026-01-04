/**
 * Child Details Screen - Compact Profile + Paginated Activity
 * Professional Minimalist Design
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { ParentScreenProps } from '../../types/navigation';
import {
    useGetChildrenQuery,
    useGetChildStatusQuery,
    useGetChildHistoryQuery,
} from '../../store/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Avatar, LoadingSpinner } from '../../components/common';
import { Attendance, Student } from '../../types/models';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Professional muted color palette
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

const ITEMS_PER_PAGE = 5;

const ChildDetailsScreen: React.FC<ParentScreenProps<'ChildDetails'>> = ({
    route,
    navigation,
}) => {
    const { studentId } = route.params;
    const [showAllActivity, setShowAllActivity] = useState(false);
    const [activityPage, setActivityPage] = useState(0);

    // RTK Query hooks
    const { child, isLoading: isLoadingChild } = useGetChildrenQuery(undefined, {
        selectFromResult: ({ data, isLoading }) => ({
            child: data?.find((c: Student) => c.id === studentId),
            isLoading,
        }),
    });

    const { data: status, isLoading: isLoadingStatus } = useGetChildStatusQuery(studentId, {
        skip: !studentId,
    });

    const { data: historyData, isLoading: isLoadingHistory } = useGetChildHistoryQuery(
        { studentId, days: 30 },
        { skip: !studentId }
    );

    const history = Array.isArray(historyData) ? historyData : [];

    // Pagination logic
    const displayedHistory = useMemo(() => {
        if (!showAllActivity) return history.slice(0, 3);
        const start = activityPage * ITEMS_PER_PAGE;
        return history.slice(start, start + ITEMS_PER_PAGE);
    }, [history, showAllActivity, activityPage]);

    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);

    // Derive child name with fallback
    const childName = useMemo(() => {
        if (!child) return 'Loading...';
        return child.full_name || `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Unknown';
    }, [child]);

    const handleTrack = () => {
        navigation.navigate('ParentTabs', { screen: 'Track', params: { studentId } });
    };

    const getStatusInfo = () => {
        if (!status) return { icon: 'help-outline', text: 'Unknown', color: COLORS.mediumGray };
        switch (status.status) {
            case 'on_bus': return { icon: 'directions-bus', text: 'On Bus', color: COLORS.success };
            case 'dropped': return { icon: 'home', text: 'Home', color: COLORS.dark };
            default: return { icon: 'schedule', text: 'Waiting', color: COLORS.warning };
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    if (isLoadingChild && !child) {
        return <LoadingSpinner fullScreen />;
    }

    const statusInfo = getStatusInfo();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Child Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown}>
                    {/* Compact Profile Card - Horizontal Layout */}
                    <View style={styles.profileCard}>
                        <Avatar source={child?.photo} name={childName} size="medium" />
                        <View style={styles.profileInfo}>
                            <Text style={styles.childName} numberOfLines={1}>{childName}</Text>
                            <Text style={styles.childMeta}>
                                Grade {child?.grade}{child?.section ? ` • ${child.section}` : ''} • {child?.admission_number}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
                                <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
                                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                                    {isLoadingStatus ? '...' : statusInfo.text}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Track Bus Button - Visible when on bus */}
                    {status?.status === 'on_bus' && (
                        <TouchableOpacity style={styles.trackBusBtn} onPress={handleTrack}>
                            <View style={styles.trackBusIcon}>
                                <Icon name="location-on" size={20} color={COLORS.white} />
                            </View>
                            <View style={styles.trackBusInfo}>
                                <Text style={styles.trackBusTitle}>Track Bus Live</Text>
                                <Text style={styles.trackBusSubtitle}>{childName} is currently on the bus</Text>
                            </View>
                            <Icon name="chevron-right" size={22} color={COLORS.white} />
                        </TouchableOpacity>
                    )}

                    {/* Transport Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Transport</Text>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Icon name="route" size={18} color={COLORS.lightGray} />
                                <Text style={styles.infoLabel}>Route</Text>
                                <Text style={styles.infoValue}>{child?.route_name || 'Not assigned'}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <Icon name="place" size={18} color={COLORS.lightGray} />
                                <Text style={styles.infoLabel}>Stop</Text>
                                <Text style={styles.infoValue}>{child?.stop_name || 'Not assigned'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Activity Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Activity</Text>
                            {history.length > 3 && !showAllActivity && (
                                <TouchableOpacity onPress={() => setShowAllActivity(true)}>
                                    <Text style={styles.showMoreLink}>Show More</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {isLoadingHistory ? (
                            <View style={styles.loadingCard}>
                                <Text style={styles.loadingText}>Loading...</Text>
                            </View>
                        ) : history.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Icon name="history" size={28} color={COLORS.lightGray} />
                                <Text style={styles.emptyText}>No activity</Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.historyList}>
                                    {displayedHistory.map((record: Attendance) => (
                                        <View key={record.id} style={styles.historyItem}>
                                            <View style={[
                                                styles.historyIcon,
                                                { backgroundColor: record.event_type === 'checkin' ? `${COLORS.success}15` : `${COLORS.accent}15` }
                                            ]}>
                                                <Icon
                                                    name={record.event_type === 'checkin' ? 'login' : 'logout'}
                                                    size={14}
                                                    color={record.event_type === 'checkin' ? COLORS.success : COLORS.accent}
                                                />
                                            </View>
                                            <View style={styles.historyInfo}>
                                                <Text style={styles.historyEvent}>
                                                    {record.event_type === 'checkin' ? 'Boarded' : 'Dropped'}
                                                </Text>
                                                <Text style={styles.historyTime}>
                                                    {formatDate(record.timestamp)} • {formatTime(record.timestamp)}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {/* Pagination Controls */}
                                {showAllActivity && totalPages > 1 && (
                                    <View style={styles.paginationRow}>
                                        <TouchableOpacity
                                            style={[styles.pageBtn, activityPage === 0 && styles.pageBtnDisabled]}
                                            onPress={() => setActivityPage(p => Math.max(0, p - 1))}
                                            disabled={activityPage === 0}
                                        >
                                            <Icon name="chevron-left" size={20} color={activityPage === 0 ? COLORS.lightGray : COLORS.dark} />
                                        </TouchableOpacity>
                                        <Text style={styles.pageText}>
                                            {activityPage + 1} / {totalPages}
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.pageBtn, activityPage >= totalPages - 1 && styles.pageBtnDisabled]}
                                            onPress={() => setActivityPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={activityPage >= totalPages - 1}
                                        >
                                            <Icon name="chevron-right" size={20} color={activityPage >= totalPages - 1 ? COLORS.lightGray : COLORS.dark} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {showAllActivity && (
                                    <TouchableOpacity
                                        style={styles.collapseBtn}
                                        onPress={() => { setShowAllActivity(false); setActivityPage(0); }}
                                    >
                                        <Text style={styles.collapseBtnText}>Show Less</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.surface },
    header: {
        backgroundColor: COLORS.dark,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.white },
    scrollView: { flex: 1, backgroundColor: COLORS.dark },
    scrollContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        paddingTop: 20,
        minHeight: '100%',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    profileInfo: { flex: 1, marginLeft: 12 },
    childName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
    childMeta: { fontSize: 12, color: COLORS.lightGray, marginTop: 2 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '600' },
    trackBusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success,
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
    },
    trackBusIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackBusInfo: {
        flex: 1,
        marginLeft: 12,
    },
    trackBusTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
    },
    trackBusSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
    showMoreLink: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
    infoCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    infoLabel: { fontSize: 13, color: COLORS.lightGray },
    infoValue: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.dark, textAlign: 'right' },
    divider: { height: 1, backgroundColor: COLORS.border },
    loadingCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    loadingText: { fontSize: 12, color: COLORS.lightGray },
    emptyCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    emptyText: { fontSize: 12, color: COLORS.lightGray, marginTop: 6 },
    historyList: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    historyItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    historyIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    historyInfo: { flex: 1, marginLeft: 10 },
    historyEvent: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
    historyTime: { fontSize: 11, color: COLORS.lightGray, marginTop: 1 },
    paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 16 },
    pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    pageBtnDisabled: { opacity: 0.5 },
    pageText: { fontSize: 13, fontWeight: '500', color: COLORS.mediumGray },
    collapseBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
    collapseBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
});

export default ChildDetailsScreen;
