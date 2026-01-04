/**
 * Notifications Screen - Professional Design with Rounded Body
 */

import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { ParentTabScreenProps } from '../../types/navigation';
import {
    useGetNotificationsQuery,
    useGetUnreadCountQuery,
    useMarkAllReadMutation,
    useMarkNotificationReadMutation,
} from '../../store/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LoadingSpinner } from '../../components/common';
import { NotificationCard } from '../../components/cards';
import { Notification } from '../../types/models';

const COLORS = {
    dark: '#1a1a2e',
    darkGray: '#2d2d44',
    mediumGray: '#4a4a68',
    lightGray: '#9ca3af',
    surface: '#f8f9fa',
    white: '#ffffff',
    accent: '#4f46e5',
    border: '#e5e7eb',
};

const NotificationsScreen: React.FC<ParentTabScreenProps<'Notifications'>> = ({
    navigation,
}) => {
    const {
        data: notifications = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetNotificationsQuery({ limit: 50 });

    const { data: unreadData } = useGetUnreadCountQuery();
    const unreadCount = unreadData?.unread_count ?? 0;

    const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllReadMutation();
    const [markRead] = useMarkNotificationReadMutation();

    const handleNotificationPress = useCallback(async (notification: Notification) => {
        if (!notification.is_read) {
            markRead(notification.id);
        }
        if (notification.student && notification.trip) {
            navigation.navigate('Track', { studentId: notification.student });
        }
    }, [markRead, navigation]);

    const handleMarkAllRead = useCallback(async () => {
        if (unreadCount > 0) {
            await markAllRead();
        }
    }, [markAllRead, unreadCount]);

    const renderItem = useCallback(({ item }: { item: Notification }) => (
        <NotificationCard
            notification={item}
            onPress={() => handleNotificationPress(item)}
        />
    ), [handleNotificationPress]);

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Icon name="notifications-none" size={48} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>Updates about your children's bus will appear here</Text>
        </View>
    );

    if (isLoading && notifications.length === 0) {
        return <LoadingSpinner fullScreen text="Loading..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Notifications</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.unreadCount}>{unreadCount} unread</Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead} disabled={isMarkingAll}>
                        <Text style={[styles.markRead, isMarkingAll && styles.markReadDisabled]}>
                            {isMarkingAll ? 'Marking...' : 'Mark all read'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* List with rounded top */}
            <View style={styles.listWrapper}>
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching}
                            onRefresh={refetch}
                            colors={[COLORS.accent]}
                            tintColor={COLORS.accent}
                        />
                    }
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.dark,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.dark,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.white,
    },
    unreadCount: {
        fontSize: 12,
        color: COLORS.lightGray,
        marginTop: 2,
    },
    markRead: {
        fontSize: 13,
        color: COLORS.accent,
        fontWeight: '600',
    },
    markReadDisabled: {
        color: COLORS.mediumGray,
    },
    listWrapper: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    listContent: {
        flexGrow: 1,
        padding: 16,
        paddingTop: 20,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.mediumGray,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.lightGray,
        textAlign: 'center',
        marginTop: 4,
    },
});

export default NotificationsScreen;
