/**
 * Child Details Screen - Full information about a child
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import { ParentScreenProps } from '../../types/navigation';
import {
    useGetChildStatusQuery,
    useGetChildHistoryQuery,
} from '../../store/api';
import { useAppSelector } from '../../hooks';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Avatar, LoadingSpinner, Button } from '../../components/common';
import { Attendance } from '../../types/models';

const ChildDetailsScreen: React.FC<ParentScreenProps<'ChildDetails'>> = ({
    route,
    navigation,
}) => {
    const { studentId } = route.params;

    // Get child from cached children data
    const children = useAppSelector((state) =>
        (state.api.queries['getChildren(undefined)'] as any)?.data || []
    );
    const child = children.find((c: any) => c.id === studentId);

    // Fetch current status
    const { data: status, isLoading: isLoadingStatus } = useGetChildStatusQuery(studentId);

    // Fetch attendance history
    const { data: history = [], isLoading: isLoadingHistory } = useGetChildHistoryQuery({
        studentId,
        days: 7,
    });

    const handleTrack = () => {
        navigation.navigate('Track', { studentId });
    };

    if (!child) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="arrow-back" size={24} color={colors.primary} />
                        <Text style={[styles.backText, { marginLeft: 4 }]}>Back</Text>
                    </View>
                </TouchableOpacity>

                {/* Child Info Card */}
                <Card style={styles.profileCard}>
                    <Avatar
                        source={child.photo}
                        name={child.full_name}
                        size="large"
                        style={styles.avatar}
                    />
                    <Text style={styles.childName}>{child.full_name}</Text>
                    <Text style={styles.childGrade}>
                        Grade {child.grade}
                        {child.section ? ` - Section ${child.section}` : ''}
                    </Text>
                    <Text style={styles.admissionNo}>ID: {child.admission_number}</Text>
                </Card>

                {/* Current Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Status</Text>
                    <Card style={styles.statusCard}>
                        {isLoadingStatus ? (
                            <LoadingSpinner />
                        ) : status ? (
                            <>
                                <View style={styles.statusRow}>
                                    <View style={styles.statusIcon}>
                                        <Icon
                                            name={status.status === 'on_bus' ? 'directions-bus' : status.status === 'dropped' ? 'home' : 'hourglass-empty'}
                                            size={32}
                                            color={colors.primary}
                                        />
                                    </View>
                                    <View style={styles.statusInfo}>
                                        <Text style={styles.statusText}>{status.message}</Text>
                                        <Text style={styles.statusTime}>
                                            {status.today_records.length > 0 &&
                                                `Last update: ${new Date(status.today_records[status.today_records.length - 1].timestamp).toLocaleTimeString()}`
                                            }
                                        </Text>
                                    </View>
                                </View>
                                {status.active_trip_id && (
                                    <Button
                                        title="Track Live"
                                        onPress={handleTrack}
                                        style={styles.trackButton}
                                    />
                                )}
                            </>
                        ) : (
                            <Text style={styles.noData}>No status available</Text>
                        )}
                    </Card>
                </View>

                {/* Route Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transport Details</Text>
                    <Card style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Route</Text>
                            <Text style={styles.infoValue}>{child.route_name || 'Not assigned'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Stop</Text>
                            <Text style={styles.infoValue}>{child.stop_name || 'Not assigned'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Pickup Address</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>
                                {child.pickup_address || 'Not set'}
                            </Text>
                        </View>
                    </Card>
                </View>

                {/* Attendance History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Last 7 Days</Text>
                    {isLoadingHistory ? (
                        <LoadingSpinner />
                    ) : history.length > 0 ? (
                        <Card style={styles.historyCard}>
                            {history.slice(0, 10).map((record: Attendance, index: number) => (
                                <View key={record.id}>
                                    <View style={styles.historyItem}>
                                        <View style={styles.historyIcon}>
                                            <Icon
                                                name={record.event_type === 'checkin' ? 'directions-bus' : 'pin-drop'}
                                                size={20}
                                                color={colors.textSecondary}
                                            />
                                        </View>
                                        <View style={styles.historyInfo}>
                                            <Text style={styles.historyEvent}>
                                                {record.event_type === 'checkin' ? 'Boarded' : 'Dropped'}
                                            </Text>
                                            <Text style={styles.historyTime}>
                                                {new Date(record.timestamp).toLocaleString()}
                                            </Text>
                                        </View>
                                        {record.confidence_score > 0 && (
                                            <View style={styles.confidenceBadge}>
                                                <Text style={styles.confidenceText}>
                                                    {Math.round(record.confidence_score * 100)}%
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {index < Math.min(history.length - 1, 9) && (
                                        <View style={styles.divider} />
                                    )}
                                </View>
                            ))}
                        </Card>
                    ) : (
                        <Card style={styles.emptyCard}>
                            <Text style={styles.noData}>No attendance records</Text>
                        </Card>
                    )}
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
    backButton: {
        marginBottom: theme.spacing.md,
    },
    backText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.primary,
        fontWeight: '500',
    },
    profileCard: {
        alignItems: 'center',
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    avatar: {
        marginBottom: theme.spacing.md,
    },
    childName: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    childGrade: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    admissionNo: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textHint,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    statusCard: {
        padding: theme.spacing.md,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIcon: {
        fontSize: 40,
        marginRight: theme.spacing.md,
    },
    statusInfo: {
        flex: 1,
    },
    statusText: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    statusTime: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    trackButton: {
        marginTop: theme.spacing.md,
    },
    infoCard: {
        padding: 0,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    infoLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
    },
    infoValue: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
        marginLeft: theme.spacing.md,
    },
    historyCard: {
        padding: 0,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    historyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    historyEmoji: {
        fontSize: 20,
    },
    historyInfo: {
        flex: 1,
    },
    historyEvent: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    historyTime: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    confidenceBadge: {
        backgroundColor: colors.successLight || colors.primaryLight,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    confidenceText: {
        fontSize: theme.typography.fontSize.xs,
        color: colors.success,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginHorizontal: theme.spacing.md,
    },
    emptyCard: {
        padding: theme.spacing.lg,
        alignItems: 'center',
    },
    noData: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textHint,
        textAlign: 'center',
    },
});

export default ChildDetailsScreen;
