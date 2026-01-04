/**
 * Face Scan Screen - Camera view for face recognition check-in/out
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { ConductorScreenProps } from '../../types/navigation';
import {
    useFaceCheckinMutation,
    useFaceCheckoutMutation,
} from '../../store/api';
import { useLocation } from '../../hooks';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button, LoadingSpinner, Avatar } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FaceScanScreen: React.FC<ConductorScreenProps<'FaceScan'>> = ({
    route,
    navigation,
}) => {
    const { tripId, eventType } = route.params;
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();
    const [autoScanEnabled, setAutoScanEnabled] = useState(true);

    const [isCapturing, setIsCapturing] = useState(false);
    const [lastResult, setLastResult] = useState<{
        success: boolean;
        student?: any;
        message: string;
    } | null>(null);

    const scanAnimation = useRef(new Animated.Value(0)).current;

    const { location, getCurrentLocation } = useLocation();
    const [faceCheckin, { isLoading: isCheckingIn }] = useFaceCheckinMutation();
    const [faceCheckout, { isLoading: isCheckingOut }] = useFaceCheckoutMutation();

    const isProcessing = isCheckingIn || isCheckingOut;

    // Request camera permission on mount
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission, requestPermission]);

    // Scan animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnimation, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scanAnimation, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [scanAnimation]);

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current || isCapturing || isProcessing) return;

        setIsCapturing(true);
        setLastResult(null);

        try {
            // Take photo
            const photo = await cameraRef.current.takePhoto({
                qualityPrioritization: 'quality',
            });

            // Get current location
            const loc = await getCurrentLocation();

            // Create form data
            const formData = new FormData();
            formData.append('photo', {
                uri: `file://${photo.path}`,
                type: 'image/jpeg',
                name: 'face.jpg',
            } as any);
            formData.append('trip_id', tripId);
            if (loc) {
                formData.append('latitude', loc.latitude.toString());
                formData.append('longitude', loc.longitude.toString());
            }

            // Call appropriate API
            let result;
            if (eventType === 'checkin') {
                result = await faceCheckin(formData).unwrap();
            } else {
                result = await faceCheckout(formData).unwrap();
            }

            // Show success
            setLastResult({
                success: true,
                student: result.attendance.student_name,
                message: result.message,
            });

            // Auto-dismiss after 2 seconds
            setTimeout(() => {
                setLastResult(null);
            }, 2000);

        } catch (error: any) {
            const message = error?.data?.detail || error?.data?.message || 'Face not recognized';
            setLastResult({
                success: false,
                message,
            });

            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                setLastResult(null);
            }, 3000);
        } finally {
            setIsCapturing(false);
        }
    }, [tripId, eventType, faceCheckin, faceCheckout, getCurrentLocation, isCapturing, isProcessing]);

    // Auto-Scan Interval
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (autoScanEnabled && hasPermission && device && !isCapturing && !isProcessing && !lastResult) {
            interval = setInterval(() => {
                handleCapture();
            }, 3000); // Scan every 3 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoScanEnabled, hasPermission, device, isCapturing, isProcessing, lastResult, handleCapture]);

    if (!hasPermission) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.permissionContainer}>
                    <Icon name="camera-alt" size={64} color={colors.textSecondary} style={{ marginBottom: theme.spacing.lg }} />
                    <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                    <Text style={styles.permissionText}>
                        Please allow camera access to scan student faces for attendance.
                    </Text>
                    <Button
                        title="Grant Permission"
                        onPress={requestPermission}
                        style={styles.permissionButton}
                    />
                    <Button
                        title="Go Back"
                        onPress={() => navigation.goBack()}
                        variant="text"
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (!device) {
        return <LoadingSpinner fullScreen text="Loading camera..." />;
    }

    const scanLineTranslate = scanAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 200],
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="arrow-back" size={24} color={colors.white} />
                        <Text style={[styles.backText, { marginLeft: 4 }]}>Back</Text>
                    </View>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon
                        name={eventType === 'checkin' ? 'directions-bus' : 'logout'}
                        size={24}
                        color={colors.white}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={styles.title}>
                        {eventType === 'checkin' ? 'Check-In' : 'Check-Out'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setAutoScanEnabled(!autoScanEnabled)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: autoScanEnabled ? colors.primary : 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 16 }}>
                        <Icon name={autoScanEnabled ? "autorenew" : "touch-app"} size={16} color={colors.white} style={{ marginRight: 4 }} />
                        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
                            {autoScanEnabled ? 'AUTO' : 'MANUAL'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Camera View */}
            <View style={styles.cameraContainer}>
                <Camera
                    ref={cameraRef}
                    style={styles.camera}
                    device={device}
                    isActive={true}
                    photo={true}
                />

                {/* Face Guide Overlay */}
                <View style={styles.overlay}>
                    <View style={styles.faceGuide}>
                        {/* Corner Brackets */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />

                        {/* Scanning Line */}
                        {(isCapturing || isProcessing) && (
                            <Animated.View
                                style={[
                                    styles.scanLine,
                                    { transform: [{ translateY: scanLineTranslate }] },
                                ]}
                            />
                        )}
                    </View>

                    {/* Instructions */}
                    <Text style={styles.instructions}>
                        {isProcessing
                            ? 'Processing...'
                            : autoScanEnabled
                                ? 'Scanning for faces...'
                                : 'Position face and tap to scan'}
                    </Text>
                </View>

                {/* Result Overlay */}
                {lastResult && (
                    <View style={[
                        styles.resultOverlay,
                        lastResult.success ? styles.resultSuccess : styles.resultError,
                    ]}>
                        <Icon
                            name={lastResult.success ? "check-circle" : "error"}
                            size={48}
                            color={lastResult.success ? colors.success : colors.error}
                            style={{ marginBottom: 8 }}
                        />
                        <Text style={styles.resultTitle}>
                            {lastResult.success ? lastResult.student : 'Not Recognized'}
                        </Text>
                        <Text style={styles.resultMessage}>{lastResult.message}</Text>
                    </View>
                )}
            </View>

            {/* Capture Button */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[
                        styles.captureButton,
                        (isCapturing || isProcessing) && styles.captureButtonDisabled,
                    ]}
                    onPress={handleCapture}
                    disabled={isCapturing || isProcessing}
                >
                    <View style={styles.captureInner}>
                        {isProcessing ? (
                            <LoadingSpinner size="small" color={colors.primary} />
                        ) : (
                            <Icon name="camera" size={32} color={colors.white} />
                        )}
                    </View>
                </TouchableOpacity>
                <Text style={styles.captureHint}>
                    Tap to scan
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.black || '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: {
        padding: theme.spacing.sm,
    },
    backText: {
        color: colors.white,
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
    },
    title: {
        color: colors.white,
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    faceGuide: {
        width: 250,
        height: 300,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: colors.white,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 20,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 20,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 20,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 20,
    },
    scanLine: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: 3,
        backgroundColor: colors.primary,
        opacity: 0.7,
    },
    instructions: {
        color: colors.white,
        fontSize: theme.typography.fontSize.md,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    resultOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    resultSuccess: {
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
    },
    resultError: {
        backgroundColor: 'rgba(244, 67, 54, 0.9)',
    },
    resultIcon: {
        fontSize: 64,
        color: colors.white,
        marginBottom: theme.spacing.md,
    },
    resultTitle: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.white,
        marginBottom: theme.spacing.sm,
    },
    resultMessage: {
        fontSize: theme.typography.fontSize.md,
        color: colors.white,
        textAlign: 'center',
        opacity: 0.9,
    },
    controls: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: colors.primary,
    },
    captureButtonDisabled: {
        opacity: 0.5,
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureIcon: {
        fontSize: 28,
    },
    captureHint: {
        color: colors.white,
        fontSize: theme.typography.fontSize.sm,
        marginTop: theme.spacing.sm,
        opacity: 0.8,
    },
    permissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        backgroundColor: colors.background,
    },
    permissionIcon: {
        fontSize: 64,
        marginBottom: theme.spacing.lg,
    },
    permissionTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    permissionText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    permissionButton: {
        marginBottom: theme.spacing.md,
        minWidth: 200,
    },
});

export default FaceScanScreen;
