/**
 * Fees Screen - Track School/Bus Fees and Payment Status
 * Professional Minimalist Design matching Parent Dashboard
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { ParentScreenProps } from '../../types/navigation';
import Icon from 'react-native-vector-icons/MaterialIcons';
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

// Mock fee data - In production, this would come from API
const MOCK_FEES = [
    {
        id: '1',
        type: 'school',
        name: 'School Fees - Term 1',
        amount: 25000,
        dueDate: '2026-01-15',
        status: 'paid',
        paidDate: '2025-12-20',
        childName: 'John Doe',
    },
    {
        id: '2',
        type: 'bus',
        name: 'Bus Transport - Q1 2026',
        amount: 8000,
        dueDate: '2026-01-10',
        status: 'pending',
        paidDate: null,
        childName: 'John Doe',
    },
    {
        id: '3',
        type: 'school',
        name: 'School Fees - Term 2',
        amount: 25000,
        dueDate: '2026-04-15',
        status: 'upcoming',
        paidDate: null,
        childName: 'John Doe',
    },
    {
        id: '4',
        type: 'registration',
        name: 'Annual Registration',
        amount: 5000,
        dueDate: '2026-06-01',
        status: 'upcoming',
        paidDate: null,
        childName: 'John Doe',
    },
    {
        id: '5',
        type: 'bus',
        name: 'Bus Transport - Q2 2026',
        amount: 8000,
        dueDate: '2026-04-01',
        status: 'upcoming',
        paidDate: null,
        childName: 'John Doe',
    },
];

type FeeStatus = 'all' | 'pending' | 'paid' | 'upcoming';

const FeesScreen: React.FC<any> = ({ navigation }) => {
    const [filter, setFilter] = useState<FeeStatus>('all');
    const [refreshing, setRefreshing] = useState(false);

    const fees = MOCK_FEES;

    const filteredFees = fees.filter(fee => {
        if (filter === 'all') return true;
        return fee.status === filter;
    });

    const totalPending = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const totalUpcoming = fees.filter(f => f.status === 'upcoming').reduce((sum, f) => sum + f.amount, 0);

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid':
                return { bg: `${COLORS.success}15`, color: COLORS.success, icon: 'check-circle' };
            case 'pending':
                return { bg: `${COLORS.warning}15`, color: COLORS.warning, icon: 'schedule' };
            case 'upcoming':
                return { bg: `${COLORS.accent}15`, color: COLORS.accent, icon: 'event' };
            default:
                return { bg: COLORS.surface, color: COLORS.mediumGray, icon: 'help' };
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'school':
                return 'school';
            case 'bus':
                return 'directions-bus';
            case 'registration':
                return 'assignment';
            default:
                return 'receipt';
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        // Simulate API call
        setTimeout(() => setRefreshing(false), 1000);
    };

    const FilterTab: React.FC<{ label: string; value: FeeStatus; count: number }> = ({ label, value, count }) => (
        <TouchableOpacity
            style={[styles.filterTab, filter === value && styles.filterTabActive]}
            onPress={() => setFilter(value)}
        >
            <Text style={[styles.filterTabText, filter === value && styles.filterTabTextActive]}>
                {label}
            </Text>
            <Text style={[styles.filterTabCount, filter === value && styles.filterTabCountActive]}>
                {count}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Fees & Payments</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Animated.View entering={FadeInDown}>
                    {/* Summary Cards */}
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, { borderLeftColor: COLORS.warning }]}>
                            <Text style={styles.summaryLabel}>Pending</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{formatCurrency(totalPending)}</Text>
                        </View>
                        <View style={[styles.summaryCard, { borderLeftColor: COLORS.success }]}>
                            <Text style={styles.summaryLabel}>Paid</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(totalPaid)}</Text>
                        </View>
                    </View>

                    <View style={styles.upcomingCard}>
                        <Icon name="event" size={20} color={COLORS.accent} />
                        <View style={styles.upcomingInfo}>
                            <Text style={styles.upcomingLabel}>Upcoming Dues</Text>
                            <Text style={styles.upcomingValue}>{formatCurrency(totalUpcoming)}</Text>
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.filterRow}>
                        <FilterTab label="All" value="all" count={fees.length} />
                        <FilterTab label="Pending" value="pending" count={fees.filter(f => f.status === 'pending').length} />
                        <FilterTab label="Paid" value="paid" count={fees.filter(f => f.status === 'paid').length} />
                        <FilterTab label="Upcoming" value="upcoming" count={fees.filter(f => f.status === 'upcoming').length} />
                    </View>

                    {/* Fee Cards */}
                    <View style={styles.feesList}>
                        {filteredFees.map(fee => {
                            const statusStyle = getStatusStyle(fee.status);
                            return (
                                <View key={fee.id} style={styles.feeCard}>
                                    <View style={styles.feeCardLeft}>
                                        <View style={styles.feeIconWrapper}>
                                            <Icon name={getTypeIcon(fee.type)} size={20} color={COLORS.mediumGray} />
                                        </View>
                                        <View style={styles.feeInfo}>
                                            <Text style={styles.feeName} numberOfLines={1}>{fee.name}</Text>
                                            <Text style={styles.feeChild}>{fee.childName}</Text>
                                            <Text style={styles.feeDue}>
                                                {fee.status === 'paid' ? `Paid on ${formatDate(fee.paidDate!)}` : `Due: ${formatDate(fee.dueDate)}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.feeCardRight}>
                                        <Text style={styles.feeAmount}>{formatCurrency(fee.amount)}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                            <Icon name={statusStyle.icon} size={12} color={statusStyle.color} />
                                            <Text style={[styles.statusText, { color: statusStyle.color }]}>
                                                {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Note */}
                    <View style={styles.noteCard}>
                        <Icon name="info" size={16} color={COLORS.lightGray} />
                        <Text style={styles.noteText}>
                            For payment inquiries, please contact the school office directly.
                        </Text>
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
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderLeftWidth: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: COLORS.lightGray,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: '700',
    },
    upcomingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.accent}10`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        gap: 12,
    },
    upcomingInfo: {
        flex: 1,
    },
    upcomingLabel: {
        fontSize: 12,
        color: COLORS.mediumGray,
    },
    upcomingValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.accent,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterTabActive: {
        backgroundColor: COLORS.dark,
        borderColor: COLORS.dark,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.mediumGray,
    },
    filterTabTextActive: {
        color: COLORS.white,
    },
    filterTabCount: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.lightGray,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    filterTabCountActive: {
        backgroundColor: COLORS.mediumGray,
        color: COLORS.white,
    },
    feesList: {
        gap: 10,
    },
    feeCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    feeCardLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    feeIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    feeInfo: {
        flex: 1,
        marginLeft: 12,
    },
    feeName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 2,
    },
    feeChild: {
        fontSize: 11,
        color: COLORS.lightGray,
        marginBottom: 4,
    },
    feeDue: {
        fontSize: 11,
        color: COLORS.mediumGray,
    },
    feeCardRight: {
        alignItems: 'flex-end',
    },
    feeAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.dark,
        marginBottom: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    noteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        padding: 14,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.lightGray,
    },
});

export default FeesScreen;
