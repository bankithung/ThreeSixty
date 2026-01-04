/**
 * Face Scan Screen - Polished Camera UI for face recognition
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
    StatusBar,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission, useCameraFormat } from 'react-native-vision-camera';
import { ConductorScreenProps } from '../../types/navigation';
import {
    useFaceCheckinMutation,
    useFaceCheckoutMutation,
} from '../../store/api';
import { useLocation } from '../../hooks';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LoadingSpinner } from '../../components/common';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isCompact = SCREEN_HEIGHT < 700;

const FaceScanScreen: React.FC<ConductorScreenProps<'FaceScan'>> = ({
    route,
    navigation,
}) => {
    const { tripId, eventType } = route.params;
    const isFocused = useIsFocused();
    const cameraRef = useRef<Camera>(null);
    const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
    const device = useCameraDevice(cameraPosition);

    const format = useCameraFormat(device, [
        { videoResolution: { width: 1280, height: 720 } },
        { photoResolution: { width: 1280, height: 720 } }
    ]);

    const { hasPermission, requestPermission } = useCameraPermission();
    const [autoScanEnabled, setAutoScanEnabled] = useState(true);
    const [isCapturing, setIsCapturing] = useState(false);
    const [lastResult, setLastResult] = useState<{
        success: boolean;
        student?: any;
        message: string;
    } | null>(null);

    const scanAnimation = useRef(new Animated.Value(0)).current;
    const pulseAnimation = useRef(new Animated.Value(1)).current;

    const { getCurrentLocation } = useLocation();
    const [faceCheckin, { isLoading: isCheckingIn }] = useFaceCheckinMutation();
    const [faceCheckout, { isLoading: isCheckingOut }] = useFaceCheckoutMutation();

    const isProcessing = isCheckingIn || isCheckingOut;

    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission, requestPermission]);

    // Scan line animation
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

    // Pulse animation for capture button
    useEffect(() => {
        if (!isProcessing && !lastResult) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnimation, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnimation, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isProcessing, lastResult]);

    const toggleCamera = useCallback(() => {
        setCameraPosition(prev => prev === 'back' ? 'front' : 'back');
    }, []);

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current || isCapturing || isProcessing) return;

        setIsCapturing(true);
        setLastResult(null);

        try {
            const photo = await cameraRef.current.takePhoto({
                qualityPrioritization: 'quality',
                flash: 'off',
                enableShutterSound: false,
            });

            const loc = await getCurrentLocation();

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

            let result;
            if (eventType === 'checkin') {
                result = await faceCheckin(formData).unwrap();
            } else {
                result = await faceCheckout(formData).unwrap();
            }

            setLastResult({
                success: true,
                student: result.attendance.student_name,
                message: result.message,
            });

            setTimeout(() => setLastResult(null), 2000);
        } catch (error: any) {
            const message = error?.data?.detail || error?.data?.message || 'Face not recognized';
            setLastResult({ success: false, message });
            setTimeout(() => setLastResult(null), 3000);
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
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoScanEnabled, hasPermission, device, isCapturing, isProcessing, lastResult, handleCapture]);

    if (!hasPermission) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.permissionContainer}>
                    <View style={styles.permissionIcon}>
                        <Icon name="camera-alt" size={48} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.permissionTitle}>Camera Permission</Text>
                    <Text style={styles.permissionText}>
                        Allow camera access to scan student faces
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Text style={styles.permissionBtnText}>Grant Access</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backLink}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!device) {
        return <LoadingSpinner fullScreen text="Loading camera..." />;
    }

    const scanLineTranslate = scanAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, isCompact ? 160 : 200],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Camera View */}
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                format={format}
                isActive={isFocused && !lastResult}
                photo={true}
            />

            {/* Header Overlay */}
            <SafeAreaView style={styles.headerOverlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Icon name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>

                    <View style={styles.titleBadge}>
                        <Icon
                            name={eventType === 'checkin' ? 'login' : 'logout'}
                            size={18}
                            color={colors.white}
                        />
                        <Text style={styles.titleText}>
                            {eventType === 'checkin' ? 'Check In' : 'Check Out'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setAutoScanEnabled(!autoScanEnabled)}
                        style={[styles.modeBadge, autoScanEnabled && styles.modeBadgeActive]}
                    >
                        <Icon
                            name={autoScanEnabled ? 'autorenew' : 'touch-app'}
                            size={16}
                            color={colors.white}
                        />
                        <Text style={styles.modeText}>{autoScanEnabled ? 'AUTO' : 'TAP'}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Face Guide Overlay */}
            <View style={styles.guideOverlay}>
                <View style={styles.faceGuide}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {(isCapturing || isProcessing) && (
                        <Animated.View
                            style={[
                                styles.scanLine,
                                { transform: [{ translateY: scanLineTranslate }] },
                            ]}
                        />
                    )}
                </View>

                <Text style={styles.instructions}>
                    {isProcessing
                        ? 'Processing...'
                        : autoScanEnabled
                            ? 'Scanning for face...'
                            : 'Position face & tap to scan'}
                </Text>
            </View>

            {/* Result Overlay */}
            {lastResult && (
                <View style={[
                    styles.resultOverlay,
                    lastResult.success ? styles.resultSuccess : styles.resultError,
                ]}>
                    <Icon
                        name={lastResult.success ? 'check-circle' : 'error'}
                        size={56}
                        color={colors.white}
                    />
                    <Text style={styles.resultTitle}>
                        {lastResult.success ? lastResult.student : 'Not Recognized'}
                    </Text>
                    <Text style={styles.resultMessage}>{lastResult.message}</Text>
                </View>
            )}

            {/* Bottom Controls */}
            <View style={styles.controls}>
                <TouchableOpacity onPress={toggleCamera} style={styles.sideBtn}>
                    <Icon name="flip-camera-ios" size={24} color={colors.white} />
                </TouchableOpacity>

                <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
                    <TouchableOpacity
                        style={[
                            styles.captureButton,
                            (isCapturing || isProcessing) && styles.captureDisabled,
                        ]}
                        onPress={handleCapture}
                        disabled={isCapturing || isProcessing}
                    >
                        {isProcessing ? (
                            <LoadingSpinner size="small" color={colors.primary} />
                        ) : (
                            <Icon name="camera" size={32} color={colors.white} />
                        )}
                    </TouchableOpacity>
                </Animated.View>

                <View style={styles.sideBtn} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: StatusBar.currentHeight || 0,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    titleText: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '600',
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    modeBadgeActive: {
        backgroundColor: colors.success,
    },
    modeText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
    },
    guideOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    faceGuide: {
        width: isCompact ? 200 : 240,
        height: isCompact ? 240 : 280,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 35,
        height: 35,
        borderColor: colors.white,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 16,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 16,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 16,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 16,
    },
    scanLine: {
        position: 'absolute',
        left: 15,
        right: 15,
        height: 2,
        backgroundColor: colors.primary,
        opacity: 0.8,
    },
    instructions: {
        color: colors.white,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 24,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    resultOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    resultSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.92)',
    },
    resultError: {
        backgroundColor: 'rgba(239, 68, 68, 0.92)',
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.white,
        marginTop: 12,
    },
    resultMessage: {
        fontSize: 15,
        color: colors.white,
        textAlign: 'center',
        opacity: 0.9,
        marginTop: 6,
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: isCompact ? 20 : 30,
        paddingHorizontal: 30,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    sideBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: colors.white,
    },
    captureDisabled: {
        opacity: 0.6,
    },
    permissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        backgroundColor: colors.background,
    },
    permissionIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.indigo50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    permissionBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
        marginBottom: 16,
    },
    permissionBtnText: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '600',
    },
    backLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default FaceScanScreen;
