/**
 * Trip Summary Screen - Professional Minimalist Design
 * Clean completion summary with text sharing
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Share,
    TouchableOpacity,
    StatusBar,
    ScrollView,
} from 'react-native';
import { ConductorScreenProps } from '../../types/navigation';
import { useGetTripAttendanceQuery } from '../../store/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LoadingSpinner, Avatar } from '../../components/common';
import Animated, { FadeInUp } from 'react-native-reanimated';

// Professional color palette
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

const TripSummaryScreen: React.FC<ConductorScreenProps<'TripSummary'>> = ({
    route,
    navigation,
}) => {
    const { tripId } = route.params;

    const { data: attendanceData, isLoading } = useGetTripAttendanceQuery(tripId);

    // Define stats and trip data
    const stats = {
        total: attendanceData?.total_students || 0,
        boarded: attendanceData?.checked_in_count || 0,
        dropped: attendanceData?.checked_out_count || 0,
        pending: (attendanceData?.total_students || 0) - (attendanceData?.checked_out_count || 0),
    };

    const completionRate = stats.total > 0
        ? Math.round((stats.dropped / stats.total) * 100)
        : 0;

    // Handle different API response structures
    const trip = attendanceData?.trip || attendanceData;
    const busNumber = trip?.bus_number || trip?.bus?.number || 'N/A';
    const routeName = trip?.route_name || trip?.route?.name || 'N/A';
    const tripType = trip?.trip_type || 'morning';
    const students = attendanceData?.students || [];

    const handleShare = async () => {
        const message = `
✅ *Trip Completed Successfully!*

📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

🚌 *Bus:* ${busNumber}
📍 *Route:* ${routeName}
🕐 *Type:* ${tripType === 'morning' ? 'Morning Pickup' : 'Evening Drop'}

📊 *Summary:*
• Total Students: ${stats.total}
• Boarded: ${stats.boarded}
• Dropped: ${stats.dropped}
• Completion: ${completionRate}%

_ThreeSixty School Transport_
        `.trim();

        try {
            await Share.share({ message });
        } catch (error) {
            console.log('Share error:', error);
        }
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen text="Loading summary..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header - Outside scroll */}
            <View style={styles.header}>
                <View style={styles.successIcon}>
                    <Icon name="check" size={32} color={COLORS.white} />
                </View>
                <Text style={styles.headerTitle}>Trip Completed</Text>
                <Text style={styles.headerDate}>
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </Text>
            </View>

            {/* Content with rounded top */}
            <View style={styles.scrollView}>
                <ScrollView style={styles.contentWrapper} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Trip Details */}
                    <View style={styles.tripCard}>
                        <View style={styles.tripRow}>
                            <View style={styles.tripItem}>
                                <Text style={styles.tripLabel}>BUS</Text>
                                <Text style={styles.tripValue}>{busNumber}</Text>
                            </View>
                            <View style={styles.tripDivider} />
                            <View style={styles.tripItem}>
                                <Text style={styles.tripLabel}>ROUTE</Text>
                                <Text style={styles.tripValue} numberOfLines={1}>{routeName}</Text>
                            </View>
                            <View style={styles.tripDivider} />
                            <View style={styles.tripItem}>
                                <Text style={styles.tripLabel}>TYPE</Text>
                                <Text style={styles.tripValue}>
                                    {tripType === 'morning' ? 'Pickup' : 'Drop'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsCard}>
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{stats.total}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statNumber, { color: COLORS.success }]}>{stats.boarded}</Text>
                                <Text style={styles.statLabel}>Boarded</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statNumber, { color: COLORS.accent }]}>{stats.dropped}</Text>
                                <Text style={styles.statLabel}>Dropped</Text>
                            </View>
                            <View style={[styles.statBox, { borderRightWidth: 0 }]}>
                                <Text style={[styles.statNumber, { color: stats.pending > 0 ? COLORS.warning : COLORS.success }]}>
                                    {stats.pending}
                                </Text>
                                <Text style={styles.statLabel}>Pending</Text>
                            </View>
                        </View>

                        {/* Progress */}
                        <View style={styles.progressSection}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.progressLabel}>Completion</Text>
                                <Text style={styles.progressValue}>{completionRate}%</Text>
                            </View>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
                            </View>
                        </View>
                    </View>

                    {/* Branding */}
                    <View style={styles.branding}>
                        <Text style={styles.brandText}>ThreeSixty School Transport</Text>
                    </View>

                    {/* Activity List */}
                    {students.length > 0 && (
                        <Animated.View entering={FadeInUp.delay(200)} style={styles.activityCard}>
                            <Text style={styles.cardTitle}>Recent Activity</Text>
                            <View style={styles.activityList}>
                                {students.slice(0, 5).map((item: any) => (
                                    <View key={item.student.id} style={styles.activityItem}>
                                        <Avatar
                                            source={item.student.photo}
                                            name={item.student.full_name}
                                            size="small"
                                        />
                                        <View style={styles.activityInfo}>
                                            <Text style={styles.activityName}>{item.student.full_name}</Text>
                                            <Text style={styles.activityStop}>{item.student.route_name || 'Route'}</Text>
                                        </View>
                                        <View style={[
                                            styles.activityBadge,
                                            { backgroundColor: item.checkout ? COLORS.accent + '15' : item.checkin ? COLORS.success + '15' : COLORS.warning + '15' }
                                        ]}>
                                            <Icon
                                                name={item.checkout ? 'check' : item.checkin ? 'directions-bus' : 'schedule'}
                                                size={12}
                                                color={item.checkout ? COLORS.accent : item.checkin ? COLORS.success : COLORS.warning}
                                            />
                                        </View>
                                    </View>
                                ))}
                                {students.length > 5 && (
                                    <Text style={styles.moreText}>+{students.length - 5} more students</Text>
                                )}
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>
            </View>

            {/* Footer Actions */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Icon name="share" size={18} color={COLORS.dark} />
                    <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => navigation.navigate('ConductorHome')}
                >
                    <Text style={styles.homeBtnText}>Back to Dashboard</Text>
                    <Icon name="arrow-forward" size={18} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.surface,
    },
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.dark,
    },
    contentWrapper: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -20,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 16,
    },
    header: {
        backgroundColor: COLORS.dark,
        paddingVertical: 28,
        paddingBottom: 40,
        alignItems: 'center',
    },
    successIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: -0.3,
    },
    headerDate: {
        fontSize: 12,
        color: COLORS.lightGray,
        marginTop: 4,
    },
    tripCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 14,
        padding: 18,
    },
    tripRow: {
        flexDirection: 'row',
    },
    tripItem: {
        flex: 1,
        alignItems: 'center',
    },
    tripDivider: {
        width: 1,
        backgroundColor: COLORS.border,
    },
    tripLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: COLORS.lightGray,
        letterSpacing: 1,
        marginBottom: 4,
    },
    tripValue: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.dark,
    },
    statsCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 14,
        padding: 18,
    },
    statsGrid: {
        flexDirection: 'row',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.dark,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '500',
        color: COLORS.lightGray,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressSection: {
        paddingTop: 14,
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.mediumGray,
    },
    progressValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.dark,
    },
    progressTrack: {
        height: 8,
        backgroundColor: COLORS.surface,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.dark,
        borderRadius: 4,
    },
    branding: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    brandText: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.lightGray,
    },
    activityCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 14,
        padding: 18,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.mediumGray,
        marginBottom: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activityList: {
        gap: 10,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityInfo: {
        flex: 1,
        marginLeft: 10,
    },
    activityName: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.dark,
    },
    activityStop: {
        fontSize: 11,
        color: COLORS.lightGray,
        marginTop: 1,
    },
    activityBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreText: {
        fontSize: 11,
        color: COLORS.lightGray,
        textAlign: 'center',
        marginTop: 6,
    },
    footer: {
        flexDirection: 'row',
        padding: 14,
        gap: 10,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    shareBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    },
    homeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.dark,
        gap: 8,
    },
    homeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
    },
});

export default TripSummaryScreen;
