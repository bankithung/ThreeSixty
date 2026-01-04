/**
 * Profile Screen - Compact Responsive UI
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Switch,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../hooks';
import { useGetUserSchoolsQuery } from '../../store/api';
import { LoadingSpinner } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
    dark: '#1a1a2e',
    darkGray: '#2d2d44',
    mediumGray: '#6b7280',
    lightGray: '#9ca3af',
    surface: '#f3f4f6',
    white: '#ffffff',
    accent: '#4f46e5',
    success: '#10b981',
    error: '#ef4444',
    border: '#e5e7eb',
};

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout, isLoggingOut } = useAuth();
    const { data: schools } = useGetUserSchoolsQuery();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    if (!user) {
        return <LoadingSpinner fullScreen />;
    }

    const school = schools && schools.length > 0 ? schools[0] : null;
    const initials = (user.full_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Compact User Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName} numberOfLines={1}>{user.full_name || 'User'}</Text>
                        <Text style={styles.userRole}>
                            {(user.role || '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                    </View>
                    {school && (
                        <View style={styles.schoolBadge}>
                            <Icon name="school" size={10} color={COLORS.white} />
                            <Text style={styles.schoolText} numberOfLines={1}>{school.school_name}</Text>
                        </View>
                    )}
                </View>

                {/* Contact Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact</Text>
                    <View style={styles.card}>
                        {user.phone && (
                            <View style={styles.infoRow}>
                                <Icon name="phone" size={16} color={COLORS.mediumGray} />
                                <Text style={styles.infoText}>{user.phone}</Text>
                            </View>
                        )}
                        {user.email && (
                            <>
                                {user.phone && <View style={styles.divider} />}
                                <View style={styles.infoRow}>
                                    <Icon name="email" size={16} color={COLORS.mediumGray} />
                                    <Text style={styles.infoText} numberOfLines={1}>{user.email}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Icon name="notifications" size={18} color={COLORS.dark} />
                                <Text style={styles.settingText}>Notifications</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: COLORS.border, true: COLORS.accent + '50' }}
                                thumbColor={notificationsEnabled ? COLORS.accent : COLORS.lightGray}
                                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                            />
                        </View>
                        <View style={styles.divider} />
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => navigation.navigate('EditProfile' as any)}
                        >
                            <View style={styles.settingLeft}>
                                <Icon name="edit" size={18} color={COLORS.dark} />
                                <Text style={styles.settingText}>Edit Profile</Text>
                            </View>
                            <Icon name="chevron-right" size={18} color={COLORS.lightGray} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Icon name="language" size={18} color={COLORS.dark} />
                                <Text style={styles.settingText}>Language</Text>
                            </View>
                            <Text style={styles.settingValue}>English</Text>
                        </View>
                    </View>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Icon name="help-outline" size={18} color={COLORS.dark} />
                                <Text style={styles.settingText}>Help & FAQ</Text>
                            </View>
                            <Icon name="chevron-right" size={18} color={COLORS.lightGray} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Icon name="mail-outline" size={18} color={COLORS.dark} />
                                <Text style={styles.settingText}>Contact Support</Text>
                            </View>
                            <Icon name="chevron-right" size={18} color={COLORS.lightGray} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Icon name="description" size={18} color={COLORS.dark} />
                                <Text style={styles.settingText}>Terms & Privacy</Text>
                            </View>
                            <Icon name="chevron-right" size={18} color={COLORS.lightGray} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Version & Logout */}
                <View style={styles.footer}>
                    <Text style={styles.version}>ThreeSixty v1.0.0</Text>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
                        <Icon name="logout" size={16} color={COLORS.error} />
                        <Text style={styles.logoutText}>{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.surface,
    },
    header: {
        backgroundColor: COLORS.dark,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.darkGray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
        marginLeft: 12,
    },
    headerRight: {
        width: 32,
    },
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.dark,
    },
    scrollContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 14,
        paddingTop: 20,
        paddingBottom: 28,
        minHeight: '100%',
    },
    userCard: {
        backgroundColor: COLORS.dark,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    userRole: {
        fontSize: 12,
        color: COLORS.lightGray,
        marginTop: 2,
    },
    schoolBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: COLORS.darkGray,
        borderRadius: 10,
        maxWidth: SCREEN_WIDTH * 0.3,
    },
    schoolText: {
        fontSize: 10,
        color: COLORS.white,
        fontWeight: '500',
    },
    section: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.lightGray,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.dark,
        flex: 1,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    settingText: {
        fontSize: 14,
        color: COLORS.dark,
    },
    settingValue: {
        fontSize: 13,
        color: COLORS.lightGray,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 42,
    },
    footer: {
        alignItems: 'center',
        paddingTop: 8,
    },
    version: {
        fontSize: 11,
        color: COLORS.lightGray,
        marginBottom: 12,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        paddingVertical: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.error + '25',
    },
    logoutText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.error,
    },
});

export default ProfileScreen;
