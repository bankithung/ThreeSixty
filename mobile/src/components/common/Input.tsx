/**
 * Reusable Input Component
 */

import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextInputProps,
    TouchableOpacity,
} from 'react-native';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    containerStyle,
    leftIcon,
    rightIcon,
    onRightIconPress,
    style,
    ...rest
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainer_focused,
                    error && styles.inputContainer_error,
                ]}
            >
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                <TextInput
                    style={[styles.input, leftIcon && styles.input_withLeftIcon, style]}
                    placeholderTextColor={colors.textHint}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...rest}
                />
                {rightIcon && (
                    <TouchableOpacity
                        style={styles.rightIcon}
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                    >
                        {rightIcon}
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginBottom: theme.spacing.xs,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
    },
    inputContainer_focused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    inputContainer_error: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        fontSize: theme.typography.fontSize.md,
        color: colors.textPrimary,
        paddingVertical: theme.spacing.md,
    },
    input_withLeftIcon: {
        paddingLeft: theme.spacing.sm,
    },
    leftIcon: {
        marginRight: theme.spacing.xs,
    },
    rightIcon: {
        marginLeft: theme.spacing.xs,
    },
    error: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.error,
        marginTop: theme.spacing.xs,
    },
});

export default Input;
