/**
 * Notifications Screen - Using RTK Query
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
} from 'react-native';
import { ParentTabScreenProps } from '../../types/navigation';
import {
    useGetNotificationsQuery,
    useGetUnreadCountQuery,
    useMarkAllReadMutation,
    useMarkNotificationReadMutation,
} from '../../store/api';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LoadingSpinner } from '../../components/common';
import { NotificationCard } from '../../components/cards';
import { Notification } from '../../types/models';

const NotificationsScreen: React.FC<ParentTabScreenProps<'Notifications'>> = ({
    navigation,
}) => {
    // RTK Query hooks
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
        // Mark as read if not already
        if (!notification.is_read) {
            markRead(notification.id);
        }

        // Navigate based on notification type
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

    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Notifications</Text>
                {unreadCount > 0 && (
                    <Text style={styles.unreadCount}>{unreadCount} unread</Text>
                )}
            </View>
            {unreadCount > 0 && (
                <TouchableOpacity
                    onPress={handleMarkAllRead}
                    disabled={isMarkingAll}
                >
                    <Text style={[styles.markRead, isMarkingAll && styles.markReadDisabled]}>
                        {isMarkingAll ? 'Marking...' : 'Mark all read'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Icon name="notifications-none" size={64} color={colors.textSecondary} style={{ marginBottom: theme.spacing.md }} />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
                You'll receive updates about your children's bus here
            </Text>
        </View>
    );

    if (isLoading && notifications.length === 0) {
        return <LoadingSpinner fullScreen text="Loading notifications..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
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
    title: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    unreadCount: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    markRead: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.primary,
        fontWeight: '500',
    },
    markReadDisabled: {
        color: colors.textHint,
    },
    listContent: {
        flexGrow: 1,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xxl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    emptySubtext: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textHint,
        textAlign: 'center',
    },
});

export default NotificationsScreen;
