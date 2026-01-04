/**
 * Reports Screen - Conductor Trip History with Pagination
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { ConductorScreenProps } from '../../types/navigation';
import { useGetTripHistoryQuery } from '../../store/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LoadingSpinner } from '../../components/common';
import { Trip } from '../../types/models';

const COLORS = {
    dark: '#1a1a2e',
    darkGray: '#2d2d44',
    mediumGray: '#6b7280',
    lightGray: '#9ca3af',
    surface: '#f3f4f6',
    white: '#ffffff',
    accent: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    border: '#e5e7eb',
};

type FilterType = 'all' | 'completed' | 'in_progress';

const ReportsScreen: React.FC<ConductorScreenProps<'Reports'>> = ({ navigation }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState<FilterType>('all');

    const statusParam = filter === 'all' ? undefined : filter;
    const { data, isLoading, refetch, isFetching } = useGetTripHistoryQuery({
        page: currentPage,
        status: statusParam
    });

    const trips = data?.results || [];
    const totalCount = data?.total_count || 0;
    const completedCount = data?.completed_count || 0;
    const todayCount = data?.today_count || 0;
    const hasNext = data?.has_next || false;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return { color: COLORS.success, label: 'Done' };
            case 'in_progress': return { color: COLORS.accent, label: 'Live' };
            case 'cancelled': return { color: COLORS.error, label: 'Cancelled' };
            default: return { color: COLORS.mediumGray, label: status };
        }
    };

    const handleFilterChange = (newFilter: FilterType) => {
        setFilter(newFilter);
        setCurrentPage(1);
    };

    const handleNextPage = () => {
        if (hasNext) setCurrentPage(p => p + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const renderTripItem = ({ item }: { item: Trip }) => {
        const status = getStatusBadge(item.status);
        const tripData = item as any;

        return (
            <TouchableOpacity
                style={styles.tripRow}
                onPress={() => navigation.navigate('TripSummary', { tripId: item.id })}
                activeOpacity={0.7}
            >
                <View style={[styles.typeIndicator, item.trip_type === 'morning' ? styles.morningType : styles.eveningType]}>
                    <Icon
                        name={item.trip_type === 'morning' ? 'wb-sunny' : 'nights-stay'}
                        size={12}
                        color={COLORS.white}
                    />
                </View>
                <View style={styles.tripMainInfo}>
                    <Text style={styles.routeText} numberOfLines={1}>
                        {tripData.route_name || 'Route'}
                    </Text>
                    <Text style={styles.tripMeta}>
                        {tripData.bus_number} • {formatTime(tripData.scheduled_start)}
                    </Text>
                </View>
                <View style={styles.tripRightInfo}>
                    <Text style={styles.dateText}>{formatDate(tripData.scheduled_start)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Icon name="arrow-back" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Trip Reports</Text>
                    <View style={styles.headerRight} />
                </View>
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Compact Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trip Reports</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Content with rounded top */}
            <View style={styles.contentWrapper}>
                {/* Stats Bar */}
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.accent }]}>{todayCount}</Text>
                        <Text style={styles.statLabel}>Today</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalCount}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.success }]}>{completedCount}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
                        onPress={() => handleFilterChange('all')}
                    >
                        <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
                        onPress={() => handleFilterChange('completed')}
                    >
                        <Text style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}>Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === 'in_progress' && styles.filterTabActive]}
                        onPress={() => handleFilterChange('in_progress')}
                    >
                        <Text style={[styles.filterTabText, filter === 'in_progress' && styles.filterTabTextActive]}>In Progress</Text>
                    </TouchableOpacity>
                </View>

                {/* Trip List */}
                {trips.length > 0 ? (
                    <FlatList
                        data={trips}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTripItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
                        }
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Icon name="assessment" size={40} color={COLORS.lightGray} />
                        <Text style={styles.emptyTitle}>No Trips Found</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter !== 'all' ? 'Try changing the filter' : 'Your trips will appear here'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Pagination Footer */}
            {(trips.length > 0 || currentPage > 1) && (
                <View style={styles.paginationBar}>
                    <TouchableOpacity
                        style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                        onPress={handlePrevPage}
                        disabled={currentPage === 1}
                    >
                        <Icon name="chevron-left" size={20} color={currentPage === 1 ? COLORS.lightGray : COLORS.dark} />
                        <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>Prev</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfo}>
                        Page {currentPage} • {trips.length} trips
                    </Text>

                    <TouchableOpacity
                        style={[styles.pageBtn, !hasNext && styles.pageBtnDisabled]}
                        onPress={handleNextPage}
                        disabled={!hasNext}
                    >
                        <Text style={[styles.pageBtnText, !hasNext && styles.pageBtnTextDisabled]}>Next</Text>
                        <Icon name="chevron-right" size={20} color={!hasNext ? COLORS.lightGray : COLORS.dark} />
                    </TouchableOpacity>
                </View>
            )}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 32,
    },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.darkGray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.white,
        marginLeft: 12,
    },
    headerRight: {
        width: 32,
    },
    contentWrapper: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -20,
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.dark,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.lightGray,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.border,
        marginVertical: 4,
    },
    filterRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
    },
    filterTabActive: {
        backgroundColor: COLORS.dark,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.mediumGray,
    },
    filterTabTextActive: {
        color: COLORS.white,
    },
    listContent: {
        padding: 16,
        paddingBottom: 8,
    },
    tripRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 12,
    },
    typeIndicator: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    morningType: {
        backgroundColor: COLORS.warning,
    },
    eveningType: {
        backgroundColor: COLORS.accent,
    },
    tripMainInfo: {
        flex: 1,
        marginLeft: 10,
    },
    routeText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.dark,
    },
    tripMeta: {
        fontSize: 11,
        color: COLORS.mediumGray,
        marginTop: 2,
    },
    tripRightInfo: {
        alignItems: 'flex-end',
    },
    dateText: {
        fontSize: 10,
        color: COLORS.lightGray,
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 3,
    },
    statusDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '600',
    },
    separator: {
        height: 6,
    },
    paginationBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    pageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pageBtnDisabled: {},
    pageBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.dark,
    },
    pageBtnTextDisabled: {
        color: COLORS.lightGray,
    },
    pageInfo: {
        fontSize: 12,
        color: COLORS.mediumGray,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 13,
        color: COLORS.lightGray,
        textAlign: 'center',
        marginTop: 4,
    },
});

export default ReportsScreen;
