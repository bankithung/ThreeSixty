/**
 * Notification Card Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Notification, NotificationType } from '../../types/models';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';

interface NotificationCardProps {
    notification: Notification;
    onPress?: () => void;
}

const getNotificationIcon = (type: NotificationType): { name: string, color: string } => {
    switch (type) {
        case 'checkin':
            return { name: 'directions-bus', color: colors.success };
        case 'checkout':
            return { name: 'home', color: colors.info };
        case 'trip_started':
            return { name: 'play-arrow', color: colors.primary };
        case 'trip_ended':
            return { name: 'flag', color: colors.textSecondary };
        case 'approaching':
            return { name: 'schedule', color: colors.warning };
        case 'delay':
            return { name: 'warning', color: colors.error };
        case 'emergency':
            return { name: 'error', color: colors.error };
        default:
            return { name: 'notifications', color: colors.primary };
    }
};

const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
};

const NotificationCard: React.FC<NotificationCardProps> = ({
    notification,
    onPress,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.container,
                !notification.is_read && styles.unread,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                {(() => {
                    const { name, color } = getNotificationIcon(notification.notification_type);
                    return <Icon name={name} size={24} color={color} />;
                })()}
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{notification.title}</Text>
                <Text style={styles.body} numberOfLines={2}>
                    {notification.body}
                </Text>
                <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
            </View>
            {!notification.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    unread: {
        backgroundColor: colors.primaryLight,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 24,
    },
    content: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    title: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    body: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    time: {
        fontSize: theme.typography.fontSize.xs,
        color: colors.textHint,
        marginTop: theme.spacing.sm,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
        marginLeft: theme.spacing.sm,
    },
});

export default NotificationCard;
