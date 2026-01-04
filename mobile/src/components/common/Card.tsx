/**
 * Reusable Card Component
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    variant?: 'elevated' | 'outlined' | 'filled';
}

const Card: React.FC<CardProps> = ({
    children,
    style,
    onPress,
    variant = 'elevated',
}) => {
    const cardStyles = [styles.card, styles[`card_${variant}`], style];

    if (onPress) {
        return (
            <TouchableOpacity
                style={cardStyles}
                onPress={onPress}
                activeOpacity={0.7}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        backgroundColor: colors.surface,
    },
    card_elevated: {
        ...theme.shadows.md,
    },
    card_outlined: {
        borderWidth: 1,
        borderColor: colors.border,
    },
    card_filled: {
        backgroundColor: colors.primaryLight,
    },
});

export default Card;
