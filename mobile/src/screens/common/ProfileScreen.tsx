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
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../hooks';
import { useUpdateProfileMutation, useGetUserSchoolsQuery } from '../../store/api';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import { Card, Avatar, Button, LoadingSpinner } from '../../components/common';

interface ProfileScreenProps {
    onNavigateToSettings?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigateToSettings }) => {
    const navigation = useNavigation();
    const { user, logout, isLoggingOut } = useAuth();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const { data: schools } = useGetUserSchoolsQuery();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: logout,
                },
            ]
        );
    };

    const handleToggleNotifications = async (value: boolean) => {
        setNotificationsEnabled(value);
        // In a real app, this would update the notification preference
    };

    if (!user) {
        return <LoadingSpinner fullScreen />;
    }

    const school = schools && schools.length > 0 ? schools[0] : null;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Icon name="arrow-back" size={28} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Profile</Text>
                </View>

                {/* User Info Card */}
                <Card style={styles.userCard}>
                    <View style={styles.userInfo}>
                        <Avatar
                            source={user.avatar}
                            name={user.full_name || 'User'}
                            size="large"
                        />
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{user.full_name || 'User'}</Text>

                            {/* School Info */}
                            {school && (
                                <View style={styles.schoolContainer}>
                                    {/* Placeholder for school logo logic if URL existed, or just text */}
                                    <View style={styles.schoolInfoRow}>
                                        <Icon name="school" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                                        <Text style={styles.schoolName}>{school.school_name}</Text>
                                    </View>
                                </View>
                            )}

                            <Text style={styles.userRole}>
                                {(user.role || '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Text>
                            {user.phone && (
                                <View style={styles.contactRow}>
                                    <Icon name="phone" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                                    <Text style={styles.userContact}>{user.phone}</Text>
                                </View>
                            )}
                            {user.email && (
                                <View style={styles.contactRow}>
                                    <Icon name="email" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                                    <Text style={styles.userContact}>{user.email}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Card>

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>

                    <Card style={styles.settingsCard}>
                        {/* Notifications */}
                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Icon name="notifications" size={24} color={colors.textPrimary} style={{ width: 32 }} />
                                <View>
                                    <Text style={styles.settingLabel}>Push Notifications</Text>
                                    <Text style={styles.settingDescription}>
                                        Receive alerts about your child's bus
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={handleToggleNotifications}
                                trackColor={{ false: colors.border, true: colors.primaryLight }}
                                thumbColor={notificationsEnabled ? colors.primary : colors.textHint}
                            />
                        </View>

                        <View style={styles.divider} />

                        {/* Edit Profile */}
                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('EditProfile' as any)}
                        >
                            <View style={styles.settingInfo}>
                                <Icon name="edit" size={24} color={colors.textPrimary} style={{ width: 32 }} />
                                <Text style={styles.settingLabel}>Edit Profile</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={colors.textHint} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Language */}
                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Icon name="language" size={24} color={colors.textPrimary} style={{ width: 32 }} />
                                <Text style={styles.settingLabel}>Language</Text>
                            </View>
                            <View style={styles.settingValue}>
                                <Text style={styles.settingValueText}>English</Text>
                                <Icon name="chevron-right" size={24} color={colors.textHint} />
                            </View>
                        </TouchableOpacity>
                    </Card>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>

                    <Card style={styles.settingsCard}>
                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Icon name="help" size={24} color={colors.textPrimary} style={{ width: 32 }} />
                                <Text style={styles.settingLabel}>Help & FAQ</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={colors.textHint} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Icon name="mail" size={24} color={colors.textPrimary} style={{ width: 32 }} />
                                <Text style={styles.settingLabel}>Contact Support</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={colors.textHint} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Icon name="description" size={24} color={colors.textPrimary} style={{ width: 32 }} />
                                <Text style={styles.settingLabel}>Terms & Privacy</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={colors.textHint} />
                        </TouchableOpacity>
                    </Card>
                </View>

                {/* App Version */}
                <Text style={styles.version}>ThreeSixty v1.0.0</Text>

                {/* Logout Button */}
                <Button
                    title="Logout"
                    onPress={handleLogout}
                    variant="outline"
                    loading={isLoggingOut}
                    style={styles.logoutButton}
                    textStyle={{ color: colors.error }}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
    },
    header: {
        marginBottom: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: theme.spacing.sm,
    },
    title: {
        fontSize: theme.typography.fontSize.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    userCard: {
        marginBottom: theme.spacing.lg,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userDetails: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    userName: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    schoolContainer: {
        marginVertical: 4,
    },
    schoolInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    schoolName: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600', // Semi-bold for school name
        color: colors.textPrimary,
    },
    userRole: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.primary,
        fontWeight: '500',
        marginTop: 2,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    userContact: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    settingsCard: {
        padding: 0,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingLabel: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textPrimary,
    },
    settingDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textHint,
        marginTop: 2,
    },
    settingValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValueText: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginRight: theme.spacing.xs,
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginHorizontal: theme.spacing.md,
    },
    version: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textHint,
        textAlign: 'center',
        marginVertical: theme.spacing.md,
    },
    logoutButton: {
        borderColor: colors.error,
        marginTop: theme.spacing.md,
    },
});

export default ProfileScreen;
