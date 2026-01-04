/**
 * Reusable Button Component
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    StyleProp,
} from 'react-native';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    style,
    textStyle,
    icon,
}) => {
    const buttonStyles = [
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        disabled && styles.button_disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`text_${variant}`],
        styles[`text_${size}`],
        disabled && styles.text_disabled,
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={buttonStyles}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? colors.white : colors.primary}
                    size="small"
                />
            ) : (
                <>
                    {icon}
                    <Text style={textStyles}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.sm,
    },
    button_primary: {
        backgroundColor: colors.primary,
    },
    button_secondary: {
        backgroundColor: colors.secondary,
    },
    button_outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    button_text: {
        backgroundColor: 'transparent',
    },
    button_small: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    button_medium: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
    },
    button_large: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
    },
    button_disabled: {
        opacity: 0.5,
    },
    text: {
        fontWeight: '600',
    },
    text_primary: {
        color: colors.white,
    },
    text_secondary: {
        color: colors.white,
    },
    text_outline: {
        color: colors.primary,
    },
    text_text: {
        color: colors.primary,
    },
    text_small: {
        fontSize: theme.typography.fontSize.sm,
    },
    text_medium: {
        fontSize: theme.typography.fontSize.md,
    },
    text_large: {
        fontSize: theme.typography.fontSize.lg,
    },
    text_disabled: {
        color: colors.textDisabled,
    },
});

export default Button;
