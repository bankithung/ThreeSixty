/**
 * Avatar Component
 */

import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';

interface AvatarProps {
    source?: string | null;
    name?: string;
    size?: 'small' | 'medium' | 'large';
    style?: ViewStyle;
}

const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const getColorFromName = (name: string): string => {
    const avatarColors = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
        '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722',
    ];
    const charCode = name.charCodeAt(0) || 0;
    return avatarColors[charCode % avatarColors.length];
};

const Avatar: React.FC<AvatarProps> = ({
    source,
    name = '',
    size = 'medium',
    style,
}) => {
    const dimensions = {
        small: 32,
        medium: 48,
        large: 72,
    }[size];

    const fontSize = {
        small: 12,
        medium: 18,
        large: 28,
    }[size];

    const containerStyle = {
        width: dimensions,
        height: dimensions,
        borderRadius: dimensions / 2,
    };

    if (source) {
        return (
            <Image
                source={{ uri: source }}
                style={[styles.image, containerStyle, style]}
            />
        );
    }

    return (
        <View
            style={[
                styles.placeholder,
                containerStyle,
                { backgroundColor: getColorFromName(name) },
                style,
            ]}
        >
            <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    image: {
        resizeMode: 'cover',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        color: colors.white,
        fontWeight: '600',
    },
});

export default Avatar;
