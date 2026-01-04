/**
 * Notification Card - Professional Minimalist Design
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Notification, NotificationType } from '../../types/models';

const COLORS = {
    dark: '#1a1a2e',
    mediumGray: '#4a4a68',
    lightGray: '#9ca3af',
    surface: '#f8f9fa',
    white: '#ffffff',
    accent: '#4f46e5',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    border: '#e5e7eb',
};

interface NotificationCardProps {
    notification: Notification;
    onPress?: () => void;
}

const getNotificationIcon = (type: NotificationType): { name: string; color: string; bg: string } => {
    switch (type) {
        case 'checkin':
            return { name: 'directions-bus', color: COLORS.success, bg: '#dcfce7' };
        case 'checkout':
            return { name: 'home', color: COLORS.dark, bg: '#f3f4f6' };
        case 'trip_started':
            return { name: 'play-arrow', color: COLORS.accent, bg: '#eef2ff' };
        case 'trip_ended':
            return { name: 'flag', color: COLORS.mediumGray, bg: '#f3f4f6' };
        case 'approaching':
            return { name: 'schedule', color: COLORS.warning, bg: '#fef3c7' };
        case 'delay':
            return { name: 'warning', color: COLORS.error, bg: '#fef2f2' };
        case 'emergency':
            return { name: 'error', color: COLORS.error, bg: '#fef2f2' };
        default:
            return { name: 'notifications', color: COLORS.dark, bg: '#f3f4f6' };
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

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NotificationCard: React.FC<NotificationCardProps> = ({
    notification,
    onPress,
}) => {
    const isUnread = !notification.is_read;
    const iconInfo = getNotificationIcon(notification.notification_type);

    return (
        <TouchableOpacity
            style={[styles.container, isUnread && styles.unread]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Unread indicator bar */}
            {isUnread && <View style={styles.unreadBar} />}

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: iconInfo.bg }]}>
                <Icon name={iconInfo.name} size={20} color={iconInfo.color} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
                        {notification.title}
                    </Text>
                    <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
                </View>
                <Text style={styles.body} numberOfLines={2}>
                    {notification.body}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
        overflow: 'hidden',
    },
    unread: {
        backgroundColor: '#eef2ff',
        borderColor: COLORS.accent,
        borderLeftWidth: 0,
    },
    unreadBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: COLORS.accent,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 12,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.mediumGray,
        marginRight: 8,
    },
    titleUnread: {
        fontWeight: '700',
        color: COLORS.dark,
    },
    body: {
        fontSize: 13,
        color: COLORS.lightGray,
        marginTop: 4,
        lineHeight: 18,
    },
    time: {
        fontSize: 11,
        color: COLORS.lightGray,
    },
});

export default NotificationCard;
