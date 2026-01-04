/**
 * Student List Screen for Conductor - Shows all students on route
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Alert,
    Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ConductorScreenProps } from '../../types/navigation';
import {
    useGetTripAttendanceQuery,
    useManualAttendanceMutation,
} from '../../store/api';
import { useAppDispatch, useLocation } from '../../hooks';
import { updateStudentStatus } from '../../store/slices/tripSlice';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Avatar, LoadingSpinner, Button } from '../../components/common';

interface StudentAttendance {
    student: {
        id: string;
        full_name: string;
        first_name: string;
        photo: string | null;
        grade: string;
        section: string | null;
        stop_name: string;
    };
    checkin: any;
    checkout: any;
    status: 'not_boarded' | 'on_bus' | 'dropped';
}

const StudentListScreen: React.FC<ConductorScreenProps<'StudentList'>> = ({
    route,
    navigation,
}) => {
    const { tripId } = route.params;
    const dispatch = useAppDispatch();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'not_boarded' | 'on_bus' | 'dropped'>('all');

    // Get current location for manual attendance
    const { location, getCurrentLocation } = useLocation();

    // RTK Query hooks
    const {
        data: attendanceData,
        isLoading,
        isFetching,
        refetch,
    } = useGetTripAttendanceQuery(tripId, {
        pollingInterval: 10000, // Refresh every 10s
    });

    const [manualAttendance, { isLoading: isMarking }] = useManualAttendanceMutation();

    const students: StudentAttendance[] = useMemo(() => {
        if (!attendanceData?.students) return [];

        let filtered = attendanceData.students;

        // Apply status filter
        if (filter !== 'all') {
            filtered = filtered.filter((s: StudentAttendance) => s.status === filter);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((s: StudentAttendance) =>
                s.student.full_name.toLowerCase().includes(query) ||
                s.student.stop_name.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [attendanceData, filter, searchQuery]);

    const stats = useMemo(() => ({
        total: attendanceData?.total_students || 0,
        notBoarded: attendanceData?.students?.filter((s: StudentAttendance) => s.status === 'not_boarded').length || 0,
        onBus: attendanceData?.checked_in_count || 0,
        dropped: attendanceData?.checked_out_count || 0,
    }), [attendanceData]);

    const handleManualAttendance = useCallback(async (
        studentId: string,
        eventType: 'checkin' | 'checkout',
        studentName: string
    ) => {
        Alert.alert(
            `Manual ${eventType === 'checkin' ? 'Check-In' : 'Check-Out'}`,
            `Mark ${studentName} as ${eventType === 'checkin' ? 'boarded' : 'dropped'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            // Get current location
                            const loc = await getCurrentLocation();

                            await manualAttendance({
                                tripId,
                                studentId,
                                eventType,
                                latitude: loc?.latitude,
                                longitude: loc?.longitude,
                                notes: 'Manual attendance',
                            }).unwrap();

                            // Update local state
                            dispatch(updateStudentStatus({
                                studentId,
                                status: eventType === 'checkin' ? 'on_bus' : 'dropped',
                            }));

                            refetch();
                        } catch (error: any) {
                            Alert.alert('Error', error?.data?.detail || 'Failed to mark attendance');
                        }
                    },
                },
            ]
        );
    }, [tripId, manualAttendance, dispatch, refetch, getCurrentLocation]);

    const handleFaceScan = useCallback((eventType: 'checkin' | 'checkout') => {
        navigation.navigate('FaceScan', { tripId, eventType });
    }, [tripId, navigation]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'on_bus': return colors.success;
            case 'dropped': return colors.info;
            default: return colors.textHint;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'on_bus': return 'On Bus';
            case 'dropped': return 'Dropped';
            default: return 'Pending';
        }
    };

    // Swipeable Actions
    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, item: StudentAttendance) => {
        const trans = dragX.interpolate({
            inputRange: [0, 50, 100],
            outputRange: [-20, 0, 0],
        });

        if (item.status !== 'not_boarded') return null;

        return (
            <TouchableOpacity
                style={styles.leftAction}
                onPress={() => handleManualAttendance(item.student.id, 'checkin', item.student.first_name)}
            >
                <Animated.View style={[styles.actionContent, { transform: [{ translateX: trans }] }]}>
                    <Icon name="check" size={24} color={colors.white} />
                    <Text style={styles.actionText}>Board</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, item: StudentAttendance) => {
        const trans = dragX.interpolate({
            inputRange: [-100, -50, 0],
            outputRange: [0, 0, 20],
        });

        if (item.status !== 'on_bus') return null;

        return (
            <TouchableOpacity
                style={styles.rightAction}
                onPress={() => handleManualAttendance(item.student.id, 'checkout', item.student.first_name)}
            >
                <Animated.View style={[styles.actionContent, { transform: [{ translateX: trans }] }]}>
                    <Icon name="logout" size={24} color={colors.white} />
                    <Text style={styles.actionText}>Drop</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderStudent = useCallback(({ item }: { item: StudentAttendance }) => (
        <Swipeable
            renderLeftActions={(p, d) => renderLeftActions(p, d, item)}
            renderRightActions={(p, d) => renderRightActions(p, d, item)}
            containerStyle={styles.swipeContainer}
        >
            <Card style={styles.studentCard}>
                <View style={styles.studentRow}>
                    <Avatar
                        source={item.student.photo}
                        name={item.student.full_name}
                        size="medium"
                    />
                    <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{item.student.full_name}</Text>
                        <Text style={styles.studentGrade}>
                            Grade {item.student.grade}
                            {item.student.section ? ` - ${item.student.section}` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Icon name="place" size={14} color={colors.primary} />
                            <Text style={[styles.studentStop, { marginTop: 0, marginLeft: 2 }]}>{item.student.stop_name}</Text>
                        </View>
                    </View>
                    <View style={styles.statusContainer}>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: getStatusColor(item.status) + '20' },
                            ]}
                        >
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: getStatusColor(item.status) },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: getStatusColor(item.status) },
                                ]}
                            >
                                {getStatusText(item.status)}
                            </Text>
                        </View>
                        {/* Swipe Hint */}
                        {item.status === 'not_boarded' && (
                            <View style={styles.swipeHint}>
                                <Icon name="keyboard-arrow-right" size={16} color={colors.textHint} />
                                <Text style={styles.swipeHintText}>Swipe Right</Text>
                            </View>
                        )}
                        {item.status === 'on_bus' && (
                            <View style={styles.swipeHint}>
                                <Text style={styles.swipeHintText}>Swipe Left</Text>
                                <Icon name="keyboard-arrow-left" size={16} color={colors.textHint} />
                            </View>
                        )}
                    </View>
                </View>
            </Card>
        </Swipeable>
    ), [handleManualAttendance]);

    if (isLoading) {
        return <LoadingSpinner fullScreen text="Loading students..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="arrow-back" size={24} color={colors.primary} />
                    <Text style={[styles.backText, { marginLeft: 4 }]}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Students</Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Stats Bar */}
            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.notBoarded}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.success }]}>{stats.onBus}</Text>
                    <Text style={styles.statLabel}>On Bus</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.info }]}>{stats.dropped}</Text>
                    <Text style={styles.statLabel}>Dropped</Text>
                </View>
            </View>

            {/* Search & Filter */}
            <View style={styles.controls}>
                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color={colors.textHint} style={{ marginRight: theme.spacing.sm }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search students..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={colors.textHint}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close" size={16} color={colors.textHint} style={{ padding: theme.spacing.xs }} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.filterRow}>
                    {(['all', 'not_boarded', 'on_bus', 'dropped'] as const).map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, filter === f && styles.filterChipActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f === 'all' ? 'All' :
                                    f === 'not_boarded' ? 'Pending' :
                                        f === 'on_bus' ? 'On Bus' : 'Dropped'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Face Scan Buttons */}
            <View style={styles.scanButtons}>
                <Button
                    title="Scan Check-In"
                    icon={<Icon name="camera-alt" size={20} color={colors.white} />}
                    onPress={() => handleFaceScan('checkin')}
                    variant="primary"
                    size="small"
                    style={styles.scanBtn}
                />
                <Button
                    title="Scan Check-Out"
                    icon={<Icon name="logout" size={20} color={colors.white} />}
                    onPress={() => handleFaceScan('checkout')}
                    variant="secondary"
                    size="small"
                    style={styles.scanBtn}
                />
            </View>

            {/* Student List */}
            <FlatList
                data={students}
                renderItem={renderStudent}
                keyExtractor={(item) => item.student.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="people-outline" size={48} color={colors.textSecondary} style={{ marginBottom: theme.spacing.md }} />
                        <Text style={styles.emptyText}>
                            {searchQuery || filter !== 'all'
                                ? 'No students match your filter'
                                : 'No students on this route'
                            }
                        </Text>
                    </View>
                }
                refreshing={isFetching}
                onRefresh={refetch}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.primary,
        fontWeight: '500',
    },
    title: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: theme.typography.fontSize.xs,
        color: colors.textSecondary,
        marginTop: 2,
    },
    controls: {
        padding: theme.spacing.md,
        backgroundColor: colors.surface,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: theme.typography.fontSize.md,
        color: colors.textPrimary,
        paddingVertical: theme.spacing.sm,
    },
    clearIcon: {
        fontSize: 14,
        color: colors.textHint,
        padding: theme.spacing.xs,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    filterChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        backgroundColor: colors.background,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.white,
        fontWeight: '500',
    },
    scanButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    scanBtn: {
        flex: 1,
    },
    listContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
    },
    studentCard: {
        marginBottom: theme.spacing.md,
    },
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    studentInfo: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    studentName: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    studentGrade: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    studentStop: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.primary,
        marginTop: 2,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: theme.spacing.xs,
    },
    statusText: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: '500',
    },
    actionRow: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionBtn: {
        minWidth: 100,
    },
    completedText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.success,
        fontWeight: '500',
    },
    empty: {
        alignItems: 'center',
        padding: theme.spacing.xxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    swipeContainer: {
        marginBottom: theme.spacing.md,
    },
    leftAction: {
        backgroundColor: colors.success,
        justifyContent: 'center',
        flex: 1,
        marginBottom: theme.spacing.md,
        marginLeft: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    rightAction: {
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'flex-end',
        flex: 1,
        marginBottom: theme.spacing.md,
        marginRight: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    actionText: {
        color: colors.white,
        fontWeight: '600',
        paddingHorizontal: 8,
    },
    swipeHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    swipeHintText: {
        fontSize: 10,
        color: colors.textHint,
    },
});

export default StudentListScreen;
