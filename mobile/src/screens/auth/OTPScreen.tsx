/**
 * OTP Verification Screen - Using RTK Query hooks
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    SafeAreaView,
    TouchableOpacity,
    Vibration,
} from 'react-native';
import { AuthScreenProps } from '../../types/navigation';
import { useAuth } from '../../hooks';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button } from '../../components/common';
import { OTP_LENGTH, OTP_RESEND_DELAY } from '../../constants/config';

const OTPScreen: React.FC<AuthScreenProps<'OTP'>> = ({ navigation, route }) => {
    const { phone } = route.params;
    const { verifyOTP, resendOTP, isVerifyingOTP, isSendingOTP, verifyOTPError } = useAuth();

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [resendTimer, setResendTimer] = useState(OTP_RESEND_DELAY);
    const [error, setError] = useState<string | null>(null);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        // Focus first input on mount
        setTimeout(() => inputRefs.current[0]?.focus(), 100);

        // Countdown timer for resend
        const interval = setInterval(() => {
            setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Show error from hook
    useEffect(() => {
        if (verifyOTPError) {
            setError(verifyOTPError);
            Vibration.vibrate(100);
        }
    }, [verifyOTPError]);

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        setError(null);

        // Move to next input
        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (newOtp.every((digit) => digit) && newOtp.join('').length === OTP_LENGTH) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newOtp = [...otp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
        }
    };

    const handleVerify = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        if (code.length !== OTP_LENGTH) return;

        setError(null);
        const result = await verifyOTP(phone, code);

        if (!result.success) {
            setError(result.error || 'Verification failed');
            // Clear OTP on error
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        }
        // If successful, Redux state will update and navigator will switch
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;

        const result = await resendOTP();
        if (result.success) {
            setResendTimer(OTP_RESEND_DELAY);
            setOtp(Array(OTP_LENGTH).fill(''));
            setError(null);
            inputRefs.current[0]?.focus();
        } else {
            setError(result.error || 'Failed to resend OTP');
        }
    };

    const maskedPhone = phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="arrow-back" size={24} color={colors.primary} />
                        <Text style={[styles.backText, { marginLeft: 4 }]}>Back</Text>
                    </View>
                </TouchableOpacity>

                {/* Title */}
                <View style={styles.headerSection}>
                    <Text style={styles.title}>Verify OTP</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-digit code sent to {maskedPhone}
                    </Text>
                </View>

                {/* OTP Inputs */}
                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => (inputRefs.current[index] = ref)}
                            style={[
                                styles.otpInput,
                                digit && styles.otpInputFilled,
                                error && styles.otpInputError,
                            ]}
                            value={digit}
                            onChangeText={(text) => handleOtpChange(text.slice(-1), index)}
                            onKeyPress={({ nativeEvent }) =>
                                handleKeyPress(nativeEvent.key, index)
                            }
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            editable={!isVerifyingOTP}
                        />
                    ))}
                </View>

                {/* Error */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.error}>{error}</Text>
                    </View>
                )}

                {/* Verify Button */}
                <Button
                    title="Verify"
                    onPress={() => handleVerify()}
                    loading={isVerifyingOTP}
                    disabled={otp.join('').length !== OTP_LENGTH}
                    style={styles.button}
                />

                {/* Resend */}
                <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    <TouchableOpacity
                        onPress={handleResend}
                        disabled={resendTimer > 0 || isSendingOTP}
                    >
                        <Text
                            style={[
                                styles.resendLink,
                                (resendTimer > 0 || isSendingOTP) && styles.resendDisabled,
                            ]}
                        >
                            {isSendingOTP
                                ? 'Sending...'
                                : resendTimer > 0
                                    ? `Resend in ${resendTimer}s`
                                    : 'Resend'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.lg,
    },
    backButton: {
        marginBottom: theme.spacing.lg,
    },
    backText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.primary,
        fontWeight: '500',
    },
    headerSection: {
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: colors.surface,
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        textAlign: 'center',
        color: colors.textPrimary,
    },
    otpInputFilled: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    otpInputError: {
        borderColor: colors.error,
        backgroundColor: '#FFF5F5',
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.md,
    },
    error: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.error,
        textAlign: 'center',
    },
    button: {
        marginTop: theme.spacing.md,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: theme.spacing.lg,
    },
    resendText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
    },
    resendLink: {
        fontSize: theme.typography.fontSize.md,
        color: colors.primary,
        fontWeight: '500',
    },
    resendDisabled: {
        color: colors.textHint,
    },
});

export default OTPScreen;
