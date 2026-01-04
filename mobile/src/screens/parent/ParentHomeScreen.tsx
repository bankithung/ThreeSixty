/**
 * Parent Home Screen - Professional Flat & Bordered Design
 */

import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    SafeAreaView,
    TouchableOpacity,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { ParentTabScreenProps } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { selectChild } from '../../store/slices/tripSlice';
import {
    useGetChildrenQuery,
    useGetChildStatusQuery,
    useGetUnreadCountQuery,
} from '../../store/api';
import { Avatar, LoadingSpinner } from '../../components/common';
import StudentCard from '../../components/cards/StudentCard';

// Design Constants
const COLORS = {
    background: '#FAFAFA',
    primary: '#4F46E5', // Indigo
    textDark: '#1E293B', // Dark Slate
    slate200: '#E2E8F0',
    slate100: '#F1F5F9',
    indigo50: '#EEF2FF',
    textGrey: '#64748B', // Slate-500
    white: '#FFFFFF',
};

const ParentHomeScreen: React.FC<ParentTabScreenProps<'Home'>> = () => {
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { selectedChildId } = useAppSelector((state) => state.trip);

    // RTK Query hooks
    const {
        data: children = [],
        isLoading: isLoadingChildren,
        isFetching: isFetchingChildren,
        refetch: refetchChildren,
    } = useGetChildrenQuery();

    const {
        data: childStatus,
    } = useGetChildStatusQuery(selectedChildId!, {
        skip: !selectedChildId,
        pollingInterval: 30000,
    });

    const { data: unreadData } = useGetUnreadCountQuery(undefined, {
        pollingInterval: 60000,
    });

    const handleChildPress = useCallback((studentId: string) => {
        dispatch(selectChild(studentId));
        navigation.navigate('Track', { studentId });
    }, [dispatch, navigation]);

    const handleRefresh = useCallback(() => {
        refetchChildren();
    }, [refetchChildren]);

    if (isLoadingChildren && children.length === 0) {
        return <LoadingSpinner fullScreen text="Loading..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetchingChildren}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetingTitle}>
                            Hello, {user?.first_name || 'User'}!
                        </Text>
                        <Text style={styles.greetingSubtitle}>Welcome back</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                        <Avatar
                            source={user?.avatar}
                            name={user?.full_name || 'U'}
                            size="medium"
                            style={{ width: 48, height: 48, borderRadius: 24 }} // Ensure circle
                        />
                    </View>
                </View>

                {/* Section 1: My Family */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Family</Text>

                    {children.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconCircle}>
                                <Icon name="family-restroom" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>No children linked</Text>
                            <Text style={styles.emptySubtitle}>
                                Link your child's account to start tracking
                            </Text>
                            <TouchableOpacity style={styles.linkButton} onPress={() => { }}>
                                <Text style={styles.linkButtonText}>Link Account</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {children.map((child) => (
                                <StudentCard
                                    key={child.id}
                                    student={child}
                                    onPress={() => handleChildPress(child.id)}
                                    status={
                                        childStatus?.student.id === child.id
                                            ? childStatus.status
                                            : undefined
                                    }
                                    showRoute
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Section 2: Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsRow}>
                        {/* Card 1: View Live Map */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('Track', { studentId: selectedChildId })}
                        >
                            <View style={styles.actionIconContainer}>
                                <Icon name="location-on" size={30} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionCardLabel}>Track</Text>
                        </TouchableOpacity>

                        <View style={{ width: 16 }} />

                        {/* Card 2: Alerts & Notifications */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('Notifications')}
                        >
                            <View style={styles.actionIconContainer}>
                                <Icon name="notifications" size={30} color={COLORS.primary} />
                                {(unreadData?.unread_count ?? 0) > 0 && (
                                    <View style={styles.notificationDot} />
                                )}
                            </View>
                            <Text style={styles.actionCardLabel}>Alerts</Text>
                        </TouchableOpacity>

                        <View style={{ width: 16 }} />

                        {/* Card 3: Marksheets */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => { }}
                        >
                            <View style={styles.actionIconContainer}>
                                <Icon name="grade" size={30} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionCardLabel}>Grades</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Row 2 */}
                    <View style={[styles.quickActionsRow, { marginTop: 16 }]}>
                        {/* Card 4: Fees */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => { }}
                        >
                            <View style={styles.actionIconContainer}>
                                <Icon name="payments" size={30} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionCardLabel}>Fees</Text>
                        </TouchableOpacity>

                        <View style={{ width: 16 }} />

                        {/* Card 5: Progress */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => { }}
                        >
                            <View style={styles.actionIconContainer}>
                                <Icon name="trending-up" size={30} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionCardLabel}>Progress</Text>
                        </TouchableOpacity>

                        <View style={{ width: 16 }} />

                        {/* Card 6: Achievements */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => { }}
                        >
                            <View style={styles.actionIconContainer}>
                                <Icon name="emoji-events" size={30} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionCardLabel}>Awards</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: 32,
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    greetingTitle: {
        fontSize: 24,
        fontWeight: '700', // Bold
        color: COLORS.textDark,
        marginBottom: 4,
    },
    greetingSubtitle: {
        fontSize: 14,
        color: COLORS.textGrey,
    },
    avatarContainer: {
        padding: 2, // Border width simulation if Avatar doesn't support it directly
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: COLORS.slate200,
        backgroundColor: COLORS.white,
    },

    // Sections
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 12,
    },

    // Empty State Card
    emptyCard: {
        width: '100%',
        padding: 24,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.slate200,
        alignItems: 'center',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.slate100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyIconText: {
        fontSize: 32,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textGrey,
        textAlign: 'center',
        marginBottom: 20,
    },
    linkButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        backgroundColor: 'transparent',
    },
    linkButtonText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },

    // Quick Actions
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    actionCard: {
        width: 110,
        padding: 12,
        backgroundColor: COLORS.indigo50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.slate200,
        alignItems: 'center',
        justifyContent: 'center',
        height: 95,
    },
    actionIconContainer: {
        padding: 8,
        backgroundColor: COLORS.indigo50,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginTop: 16,
        lineHeight: 22,
    },
    actionCardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
        marginTop: 6,
        textAlign: 'center',
    },
    notificationDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444', // Red
    }
});

export default ParentHomeScreen;
