/**
 * Login Screen - Minimal Professional Design
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    TouchableWithoutFeedback,
    Keyboard,
    TouchableOpacity,
} from 'react-native';
import { AuthScreenProps } from '../../types/navigation';
import { useAuth } from '../../hooks';
import { Button, Input } from '../../components/common';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Minimal Color Palette
const COLORS = {
    dark: '#1a1a2e',
    gray: '#6b7280',
    lightGray: '#9ca3af',
    surface: '#ffffff',
    background: '#f8f9fa',
    accent: '#4f46e5',
    border: '#e5e7eb',
    error: '#ef4444',
};

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
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.content}>

                        {/* Header / Branding */}
                        <View style={styles.header}>
                            <View style={styles.brandRow}>
                                <Icon name="school" size={28} color={COLORS.dark} />
                                <Text style={styles.brandText}>ThreeSixty</Text>
                            </View>
                            <Text style={styles.welcomeText}>Welcome back</Text>
                            <Text style={styles.subtitleText}>Enter your mobile number to login</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            <Input
                                label="Phone Number"
                                placeholder="98765 43210"
                                keyboardType="number-pad"
                                value={phone}
                                onChangeText={(text) => {
                                    setPhone(text);
                                    setError(null);
                                }}
                                maxLength={10}
                                error={error || sendOTPError || undefined}
                                leftIcon={<Text style={styles.countryCode}>+91</Text>}
                                containerStyle={styles.inputContainer}
                            />

                            <Button
                                title="Continue"
                                onPress={handleSendOTP}
                                loading={isSendingOTP}
                                disabled={phone.length < 10}
                                style={[
                                    styles.button,
                                    phone.length < 10 ? styles.buttonDisabled : {}
                                ]}
                                textStyle={styles.buttonText}
                            />
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                By continuing, you agree to our{'\n'}
                                <Text style={styles.link}>Terms of Service</Text> and{' '}
                                <Text style={styles.link}>Privacy Policy</Text>
                            </Text>
                        </View>
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
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 8,
    },
    brandText: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.dark,
        letterSpacing: -0.5,
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.dark,
        letterSpacing: -1,
        marginBottom: 8,
    },
    subtitleText: {
        fontSize: 15,
        color: COLORS.gray,
        fontWeight: '500',
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        marginBottom: 0,
    },
    countryCode: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.dark,
        marginRight: 4,
    },
    button: {
        backgroundColor: COLORS.dark,
        borderRadius: 12,
        height: 52,
        elevation: 0,
        shadowOpacity: 0,
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: COLORS.lightGray,
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: COLORS.lightGray,
        textAlign: 'center',
    },
    link: {
        color: COLORS.dark,
        fontWeight: '600',
    },
});

export default LoginScreen;
