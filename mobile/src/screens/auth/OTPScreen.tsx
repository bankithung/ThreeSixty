/**
 * OTP Verification Screen - Minimal Monochrome Design
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
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    StatusBar,
} from 'react-native';
import { AuthScreenProps } from '../../types/navigation';
import { useAuth } from '../../hooks';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button } from '../../components/common';
import { OTP_LENGTH, OTP_RESEND_DELAY } from '../../constants/config';

// Minimal Monochrome Palette
const COLORS = {
    dark: '#1a1a2e',
    gray: '#6b7280',
    lightGray: '#e5e7eb',
    surface: '#ffffff',
    background: '#f8f9fa',
    error: '#ef4444',
    text: '#1f2937',
};

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

        // Move to prev input on backspace is handled by onKeyPress

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

    const maskedPhone = phone.replace(/(\d{2})\d{6}(\d{2})/, '$1 ****** $2');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="arrow-back" size={24} color={COLORS.dark} />
                        </TouchableOpacity>

                        <View style={styles.headerSection}>
                            <Text style={styles.title}>Enter code</Text>
                            <Text style={styles.subtitle}>
                                We've sent an SMS with an activation code to your phone <Text style={styles.phoneText}>{maskedPhone}</Text>
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
                                        digit ? styles.otpInputFilled : null,
                                        error ? styles.otpInputError : null,
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
                                    cursorColor={COLORS.dark}
                                    selectionColor={COLORS.lightGray}
                                />
                            ))}
                        </View>

                        {/* Error */}
                        {error && (
                            <Text style={styles.errorText}>{error}</Text>
                        )}

                        <View style={styles.spacer} />

                        {/* Resend */}
                        <View style={styles.resendContainer}>
                            <Text style={styles.resendText}>I didn't receive a code</Text>
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
                                            ? `Resend in ${resendTimer} sec`
                                            : 'Resend'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Verify Button */}
                        {/* 
                            Optional: Auto-submit is handled, but a button is good for a11y 
                            or if user prefers clicking.
                        */}
                        <Button
                            title="Verify"
                            onPress={() => handleVerify()}
                            loading={isVerifyingOTP}
                            disabled={otp.join('').length !== OTP_LENGTH}
                            style={[
                                styles.button,
                                otp.join('').length !== OTP_LENGTH ? styles.buttonDisabled : null
                            ]}
                            textStyle={styles.buttonText}
                        />

                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        marginBottom: 32,
    },
    headerSection: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.dark,
        letterSpacing: -1,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.gray,
        lineHeight: 24,
    },
    phoneText: {
        color: COLORS.dark,
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 8,
    },
    otpInput: {
        flex: 1,
        height: 60,
        borderWidth: 1.5,
        borderColor: COLORS.lightGray,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        color: COLORS.dark,
    },
    otpInputFilled: {
        borderColor: COLORS.dark,
        backgroundColor: COLORS.surface,
    },
    otpInputError: {
        borderColor: COLORS.error,
        backgroundColor: '#FEF2F2',
    },
    errorText: {
        fontSize: 14,
        color: COLORS.error,
        textAlign: 'center',
        marginBottom: 16,
    },
    spacer: {
        flex: 1,
        minHeight: 24,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        gap: 6,
    },
    resendText: {
        fontSize: 14,
        color: COLORS.gray,
    },
    resendLink: {
        fontSize: 14,
        color: COLORS.dark,
        fontWeight: '700',
    },
    resendDisabled: {
        color: COLORS.gray,
        fontWeight: '400',
    },
    button: {
        backgroundColor: COLORS.dark,
        borderRadius: 12,
        height: 52,
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonDisabled: {
        backgroundColor: COLORS.lightGray,
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.surface,
    },
});

export default OTPScreen;
