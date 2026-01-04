/**
 * Login Screen - Using RTK Query hooks
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { AuthScreenProps } from '../../types/navigation';
import { useAuth } from '../../hooks';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import { Button, Input } from '../../components/common';

const LoginScreen: React.FC<AuthScreenProps<'Login'>> = ({ navigation }) => {
    const { sendOTP, isSendingOTP, sendOTPError, otpSent, otpPhone } = useAuth();
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Navigate to OTP screen when OTP is sent
    useEffect(() => {
        if (otpSent && otpPhone) {
            navigation.navigate('OTP', { phone: otpPhone });
        }
    }, [otpSent, otpPhone, navigation]);

    const handleSendOTP = async () => {
        if (phone.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        setError(null);
        const result = await sendOTP(phone);

        if (!result.success) {
            setError(result.error || 'Failed to send OTP');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoText}>360°</Text>
                        </View>
                        <Text style={styles.title}>ThreeSixty</Text>
                        <Text style={styles.subtitle}>School Bus Tracking</Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formSection}>
                        <Text style={styles.heading}>Welcome</Text>
                        <Text style={styles.description}>
                            Enter your phone number to continue
                        </Text>

                        <Input
                            label="Phone Number"
                            placeholder="Enter your phone number"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={(text) => {
                                setPhone(text);
                                setError(null);
                            }}
                            maxLength={15}
                            error={error || sendOTPError || undefined}
                            leftIcon={<Text style={styles.countryCode}>+91</Text>}
                        />

                        <Button
                            title="Continue"
                            onPress={handleSendOTP}
                            loading={isSendingOTP}
                            disabled={phone.length < 10}
                            style={styles.button}
                        />
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By continuing, you agree to our{' '}
                            <Text style={styles.link}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={styles.link}>Privacy Policy</Text>
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: theme.spacing.lg,
        justifyContent: 'space-between',
    },
    logoSection: {
        alignItems: 'center',
        marginTop: theme.spacing.xxl,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.white,
    },
    title: {
        fontSize: theme.typography.fontSize.xxxl,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    subtitle: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    formSection: {
        flex: 1,
        justifyContent: 'center',
    },
    heading: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    description: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    countryCode: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    button: {
        marginTop: theme.spacing.md,
    },
    footer: {
        paddingVertical: theme.spacing.lg,
    },
    footerText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    link: {
        color: colors.primary,
        fontWeight: '500',
    },
});

export default LoginScreen;
