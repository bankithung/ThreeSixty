/**
 * Student List Screen - Professional Minimalist Design
 * Matches the conductor dashboard aesthetic
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
    StatusBar,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ConductorScreenProps } from '../../types/navigation';
import {
    useGetTripAttendanceQuery,
    useManualAttendanceMutation,
} from '../../store/api';
import { useAppDispatch, useLocation } from '../../hooks';
import { updateStudentStatus } from '../../store/slices/tripSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Avatar, LoadingSpinner } from '../../components/common';

// Professional color palette (matching ConductorHomeScreen)
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

    const { getCurrentLocation } = useLocation();

    const {
        data: attendanceData,
        isLoading,
        isFetching,
        refetch,
    } = useGetTripAttendanceQuery(tripId, {
        pollingInterval: 10000,
    });

    const [manualAttendance] = useManualAttendanceMutation();

    const students: StudentAttendance[] = useMemo(() => {
        if (!attendanceData?.students) return [];

        let filtered = attendanceData.students;

        if (filter !== 'all') {
            filtered = filtered.filter((s: StudentAttendance) => s.status === filter);
        }

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
            eventType === 'checkin' ? 'Board Student' : 'Drop Student',
            `Confirm ${studentName} as ${eventType === 'checkin' ? 'boarded' : 'dropped'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            const loc = await getCurrentLocation();
                            await manualAttendance({
                                tripId,
                                studentId,
                                eventType,
                                latitude: loc?.latitude,
                                longitude: loc?.longitude,
                                notes: 'Manual attendance',
                            }).unwrap();

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

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'on_bus':
                return { color: COLORS.success, label: 'On Bus', icon: 'directions-bus' };
            case 'dropped':
                return { color: COLORS.accent, label: 'Dropped', icon: 'check-circle' };
            default:
                return { color: COLORS.warning, label: 'Pending', icon: 'schedule' };
        }
    };

    const renderLeftActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>,
        item: StudentAttendance
    ) => {
        if (item.status !== 'not_boarded') return null;

        const trans = dragX.interpolate({
            inputRange: [0, 50, 100],
            outputRange: [-20, 0, 0],
        });

        return (
            <TouchableOpacity
                style={styles.swipeAction}
                onPress={() => handleManualAttendance(item.student.id, 'checkin', item.student.first_name)}
            >
                <Animated.View style={[styles.swipeContent, { transform: [{ translateX: trans }] }]}>
                    <Icon name="login" size={20} color={COLORS.white} />
                    <Text style={styles.swipeText}>Board</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>,
        item: StudentAttendance
    ) => {
        if (item.status !== 'on_bus') return null;

        const trans = dragX.interpolate({
            inputRange: [-100, -50, 0],
            outputRange: [0, 0, 20],
        });

        return (
            <TouchableOpacity
                style={[styles.swipeAction, styles.swipeActionRight]}
                onPress={() => handleManualAttendance(item.student.id, 'checkout', item.student.first_name)}
            >
                <Animated.View style={[styles.swipeContent, { transform: [{ translateX: trans }] }]}>
                    <Icon name="logout" size={20} color={COLORS.white} />
                    <Text style={styles.swipeText}>Drop</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderStudent = useCallback(({ item }: { item: StudentAttendance }) => {
        const statusInfo = getStatusInfo(item.status);

        return (
            <Swipeable
                renderLeftActions={(p, d) => renderLeftActions(p, d, item)}
                renderRightActions={(p, d) => renderRightActions(p, d, item)}
                containerStyle={styles.swipeContainer}
            >
                <View style={styles.studentCard}>
                    <Avatar
                        source={item.student.photo}
                        name={item.student.full_name}
                        size="small"
                    />
                    <View style={styles.studentInfo}>
                        <Text style={styles.studentName} numberOfLines={1}>
                            {item.student.full_name}
                        </Text>
                        <View style={styles.studentMeta}>
                            <Text style={styles.studentGrade}>
                                {item.student.grade}{item.student.section ? `-${item.student.section}` : ''}
                            </Text>
                            <View style={styles.dot} />
                            <Text style={styles.studentStop} numberOfLines={1}>
                                {item.student.stop_name}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                        <Icon name={statusInfo.icon} size={12} color={statusInfo.color} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>
            </Swipeable>
        );
    }, [handleManualAttendance]);

    if (isLoading) {
        return <LoadingSpinner fullScreen text="Loading students..." />;
    }

    const filterOptions = [
        { key: 'all', label: 'All', count: stats.total },
        { key: 'not_boarded', label: 'Pending', count: stats.notBoarded },
        { key: 'on_bus', label: 'On Bus', count: stats.onBus },
        { key: 'dropped', label: 'Dropped', count: stats.dropped },
    ] as const;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Icon name="arrow-back" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Students</Text>
                    <View style={styles.headerCount}>
                        <Text style={styles.headerCountText}>
                            {stats.onBus}/{stats.total}
                        </Text>
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Icon name="search" size={18} color={COLORS.lightGray} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or stop..."
                        placeholderTextColor={COLORS.lightGray}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close" size={16} color={COLORS.lightGray} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {filterOptions.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                            {f.label}
                        </Text>
                        <Text style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                            {f.count}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Scan Buttons */}
            <View style={styles.scanRow}>
                <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => handleFaceScan('checkin')}
                >
                    <Icon name="camera-alt" size={18} color={COLORS.dark} />
                    <Text style={styles.scanLabel}>Check In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.scanButton, styles.scanButtonAlt]}
                    onPress={() => handleFaceScan('checkout')}
                >
                    <Icon name="logout" size={18} color={COLORS.white} />
                    <Text style={[styles.scanLabel, { color: COLORS.white }]}>Check Out</Text>
                </TouchableOpacity>
            </View>

            {/* Student List */}
            <FlatList
                data={students}
                renderItem={renderStudent}
                keyExtractor={(item) => item.student.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="people-outline" size={48} color={COLORS.border} />
                        <Text style={styles.emptyTitle}>No students found</Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery || filter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'No students assigned to this route'}
                        </Text>
                    </View>
                }
                refreshing={isFetching}
                onRefresh={refetch}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
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
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.darkGray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
        marginLeft: 12,
    },
    headerCount: {
        backgroundColor: COLORS.darkGray,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    headerCountText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.white,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.darkGray,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.white,
        marginLeft: 8,
        padding: 0,
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 8,
        gap: 4,
    },
    filterTabActive: {
        backgroundColor: COLORS.dark,
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.mediumGray,
    },
    filterLabelActive: {
        color: COLORS.white,
    },
    filterCount: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.lightGray,
    },
    filterCountActive: {
        color: COLORS.lightGray,
    },
    scanRow: {
        flexDirection: 'row',
        padding: 12,
        gap: 10,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    scanButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    scanButtonAlt: {
        backgroundColor: COLORS.dark,
        borderColor: COLORS.dark,
    },
    scanLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.dark,
    },
    listContent: {
        padding: 12,
    },
    separator: {
        height: 8,
    },
    swipeContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 14,
        borderRadius: 12,
    },
    studentInfo: {
        flex: 1,
        marginLeft: 12,
    },
    studentName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.dark,
    },
    studentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    studentGrade: {
        fontSize: 12,
        color: COLORS.lightGray,
        fontWeight: '500',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.lightGray,
        marginHorizontal: 6,
    },
    studentStop: {
        fontSize: 12,
        color: COLORS.lightGray,
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    swipeAction: {
        backgroundColor: COLORS.dark,
        justifyContent: 'center',
        borderRadius: 12,
        marginRight: 8,
        width: 80,
    },
    swipeActionRight: {
        marginRight: 0,
        marginLeft: 8,
        backgroundColor: COLORS.darkGray,
    },
    swipeContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    swipeText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.mediumGray,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 13,
        color: COLORS.lightGray,
        marginTop: 4,
    },
});

export default StudentListScreen;
