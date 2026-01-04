/**
 * Loading Spinner Component
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';

interface LoadingSpinnerProps {
    size?: 'small' | 'large';
    color?: string;
    text?: string;
    fullScreen?: boolean;
    style?: ViewStyle;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'large',
    color = colors.primary,
    text,
    fullScreen = false,
    style,
}) => {
    const containerStyle = fullScreen ? styles.fullScreen : styles.container;

    return (
        <View style={[containerStyle, style]}>
            <ActivityIndicator size={size} color={color} />
            {text && <Text style={styles.text}>{text}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    text: {
        marginTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
    },
});

export default LoadingSpinner;
