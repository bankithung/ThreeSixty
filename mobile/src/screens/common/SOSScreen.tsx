/**
 * Emergency SOS Screen - Quick emergency alert with location
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Vibration,
    Alert,
    Animated,
    Linking,
} from 'react-native';
import { useRaiseEmergencyMutation, useGetEmergencyContactsQuery } from '../../store/api';
import { useLocation, useAppSelector } from '../../hooks';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Button, LoadingSpinner } from '../../components/common';

interface SOSScreenProps {
    navigation: any;
    route?: any;
}

const EMERGENCY_TYPES = [
    { id: 'accident', label: 'Accident', icon: 'directions-car', color: '#F44336' },
    { id: 'breakdown', label: 'Breakdown', icon: 'build', color: '#FF9800' },
    { id: 'medical', label: 'Medical', icon: 'local-hospital', color: '#E91E63' },
    { id: 'security', label: 'Security', icon: 'security', color: '#9C27B0' },
    { id: 'other', label: 'Other', icon: 'warning', color: '#607D8B' },
];

const SOSScreen: React.FC<SOSScreenProps> = ({ navigation, route }) => {
    const tripId = route?.params?.tripId;
    const { currentTrip } = useAppSelector((state) => state.trip);

    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress] = useState(new Animated.Value(0));
    const [alertSent, setAlertSent] = useState(false);

    const { location, getCurrentLocation } = useLocation({ autoStart: true });
    const [raiseEmergency, { isLoading }] = useRaiseEmergencyMutation();
    const { data: contactsData } = useGetEmergencyContactsQuery();
    const contacts = contactsData?.contacts || [];

    // Vibrate when screen opens
    useEffect(() => {
        Vibration.vibrate([100, 100, 100]);
    }, []);

    const handleHoldStart = useCallback(() => {
        if (!selectedType || isLoading) return;

        setIsHolding(true);
        Vibration.vibrate(50);

        Animated.timing(holdProgress, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
        }).start(async ({ finished }) => {
            if (finished) {
                await handleSendSOS();
            }
        });
    }, [selectedType, isLoading, holdProgress]);

    const handleHoldEnd = useCallback(() => {
        setIsHolding(false);
        holdProgress.setValue(0);
    }, [holdProgress]);

    const handleSendSOS = async () => {
        if (!selectedType) return;

        // Get current location
        const loc = await getCurrentLocation();

        try {
            Vibration.vibrate([200, 100, 200, 100, 500]);

            await raiseEmergency({
                emergencyType: selectedType,
                tripId: tripId || currentTrip?.id,
                latitude: loc?.latitude,
                longitude: loc?.longitude,
            }).unwrap();

            setAlertSent(true);

            Alert.alert(
                '🚨 Emergency Alert Sent',
                'Help is on the way. School administrators have been notified with your location.',
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            Alert.alert('Error', error?.data?.detail || 'Failed to send emergency alert');
            setIsHolding(false);
            holdProgress.setValue(0);
        }
    };

    const handleCallContact = useCallback((phone: string) => {
        Linking.openURL(`tel:${phone}`);
    }, []);

    const handleCallPolice = () => Linking.openURL('tel:100');
    const handleCallAmbulance = () => Linking.openURL('tel:102');

    const progressWidth = holdProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    if (alertSent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.sentContainer}>
                    <View style={[styles.sentIcon, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Icon name="check-circle" size={64} color={colors.success} />
                    </View>
                    <Text style={styles.sentTitle}>Emergency Alert Sent</Text>
                    <Text style={styles.sentSubtitle}>
                        School officials have been notified and are responding
                    </Text>

                    {location && (
                        <Card style={styles.locationCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="place" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                <Text style={styles.locationLabel}>Your Location Shared</Text>
                            </View>
                            <Text style={styles.locationText}>
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </Text>
                        </Card>
                    )}

                    <Text style={styles.contactsTitle}>Emergency Contacts</Text>

                    <View style={styles.emergencyButtons}>
                        <TouchableOpacity style={styles.emergencyBtn} onPress={handleCallPolice}>
                            <Icon name="local-police" size={32} color={colors.white} style={{ marginBottom: theme.spacing.xs }} />
                            <Text style={styles.emergencyBtnText}>Police</Text>
                            <Text style={styles.emergencyBtnNum}>100</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.emergencyBtn} onPress={handleCallAmbulance}>
                            <Icon name="local-hospital" size={32} color={colors.white} style={{ marginBottom: theme.spacing.xs }} />
                            <Text style={styles.emergencyBtnText}>Ambulance</Text>
                            <Text style={styles.emergencyBtnNum}>102</Text>
                        </TouchableOpacity>
                    </View>

                    {contacts.length > 0 && (
                        <View style={styles.contactsList}>
                            {contacts.map((contact: any) => (
                                <TouchableOpacity
                                    key={contact.id}
                                    style={styles.contactItem}
                                    onPress={() => handleCallContact(contact.phone)}
                                >
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactDesig}>{contact.designation}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Icon name="phone" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <Button
                        title="Back to Home"
                        onPress={() => navigation.goBack()}
                        variant="outline"
                        style={styles.backButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="close" size={24} color={colors.white} />
                    <Text style={[styles.closeText, { marginLeft: 4 }]}>Close</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Emergency SOS</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Emergency Type Selection */}
            <View style={styles.typeSection}>
                <Text style={styles.sectionTitle}>Select Emergency Type</Text>
                <View style={styles.typeGrid}>
                    {EMERGENCY_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.id}
                            style={[
                                styles.typeCard,
                                selectedType === type.id && { borderColor: type.color, borderWidth: 3 },
                            ]}
                            onPress={() => setSelectedType(type.id)}
                        >
                            <Icon name={type.icon} size={32} color={selectedType === type.id ? type.color : colors.textPrimary} style={{ marginBottom: theme.spacing.xs }} />
                            <Text style={styles.typeLabel}>{type.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Location Status */}
            <Card style={styles.locationStatus}>
                <Icon name="place" size={24} color={colors.primary} style={{ marginRight: theme.spacing.md }} />
                <View style={styles.locationInfo}>
                    <Text style={styles.locationTitle}>
                        {location ? 'Location Acquired' : 'Getting Location...'}
                    </Text>
                    {location && (
                        <Text style={styles.locationCoords}>
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </Text>
                    )}
                </View>
                {location ? (
                    <Icon name="check" size={24} color={colors.success} />
                ) : (
                    <LoadingSpinner size="small" />
                )}
            </Card>

            {/* SOS Button */}
            <View style={styles.sosSection}>
                <Text style={styles.sosInstruction}>
                    {selectedType
                        ? 'Hold the button for 2 seconds to send alert'
                        : 'Select an emergency type first'
                    }
                </Text>

                <TouchableOpacity
                    style={[
                        styles.sosButton,
                        !selectedType && styles.sosButtonDisabled,
                        isHolding && styles.sosButtonHolding,
                    ]}
                    onPressIn={handleHoldStart}
                    onPressOut={handleHoldEnd}
                    disabled={!selectedType || isLoading}
                    activeOpacity={0.8}
                >
                    {/* Progress overlay */}
                    <Animated.View
                        style={[
                            styles.sosProgress,
                            { width: progressWidth },
                        ]}
                    />

                    <View style={styles.sosContent}>
                        <Icon name="notifications-active" size={48} color={colors.white} style={{ marginBottom: theme.spacing.sm }} />
                        <Text style={styles.sosText}>
                            {isLoading ? 'SENDING...' : 'HOLD FOR SOS'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Quick Call Buttons */}
            <View style={styles.quickCalls}>
                <TouchableOpacity style={styles.quickCallBtn} onPress={handleCallPolice}>
                    <Icon name="local-police" size={24} color={colors.primary} style={{ marginRight: theme.spacing.sm }} />
                    <Text style={styles.quickCallLabel}>Police (100)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickCallBtn} onPress={handleCallAmbulance}>
                    <Icon name="local-hospital" size={24} color={colors.primary} style={{ marginRight: theme.spacing.sm }} />
                    <Text style={styles.quickCallLabel}>Ambulance (102)</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: colors.error,
    },
    closeText: {
        color: colors.white,
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
    },
    title: {
        color: colors.white,
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
    },
    typeSection: {
        padding: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    typeCard: {
        width: '31%',
        backgroundColor: colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    typeIcon: {
        fontSize: 28,
        marginBottom: theme.spacing.xs,
    },
    typeLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    locationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: theme.spacing.md,
        padding: theme.spacing.md,
    },
    locationIcon: {
        fontSize: 24,
        marginRight: theme.spacing.md,
    },
    locationInfo: {
        flex: 1,
    },
    locationTitle: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    locationCoords: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    locationCheck: {
        fontSize: 24,
        color: colors.success,
    },
    sosSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    sosInstruction: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    sosButton: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        ...theme.shadows.lg,
    },
    sosButtonDisabled: {
        backgroundColor: colors.textHint,
    },
    sosButtonHolding: {
        transform: [{ scale: 0.95 }],
    },
    sosProgress: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    sosContent: {
        alignItems: 'center',
        zIndex: 1,
    },
    sosIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.sm,
    },
    sosText: {
        color: colors.white,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '700',
        letterSpacing: 1,
    },
    quickCalls: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        gap: theme.spacing.md,
    },
    quickCallBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickCallIcon: {
        fontSize: 24,
        marginRight: theme.spacing.sm,
    },
    quickCallLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    // Alert sent screen
    sentContainer: {
        flex: 1,
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    sentIcon: {
        fontSize: 64,
        color: colors.success,
        backgroundColor: '#E8F5E9',
        width: 100,
        height: 100,
        lineHeight: 100,
        textAlign: 'center',
        borderRadius: 50,
        marginTop: theme.spacing.xxl,
        marginBottom: theme.spacing.lg,
    },
    sentTitle: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    sentSubtitle: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    locationCard: {
        width: '100%',
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    locationLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
    },
    locationText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textPrimary,
        fontWeight: '500',
        marginTop: theme.spacing.xs,
    },
    contactsTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        alignSelf: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    emergencyButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        width: '100%',
        marginBottom: theme.spacing.lg,
    },
    emergencyBtn: {
        flex: 1,
        backgroundColor: colors.error,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    emergencyBtnIcon: {
        fontSize: 32,
        marginBottom: theme.spacing.xs,
    },
    emergencyBtnText: {
        color: colors.white,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '500',
    },
    emergencyBtnNum: {
        color: colors.white,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '700',
        marginTop: theme.spacing.xs,
    },
    contactsList: {
        width: '100%',
        marginBottom: theme.spacing.lg,
    },
    contactItem: {
        backgroundColor: colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    contactName: {
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    contactDesig: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textHint,
    },
    contactPhone: {
        fontSize: theme.typography.fontSize.md,
        color: colors.primary,
        fontWeight: '500',
    },
    backButton: {
        width: '100%',
        marginTop: 'auto',
    },
});

export default SOSScreen;
