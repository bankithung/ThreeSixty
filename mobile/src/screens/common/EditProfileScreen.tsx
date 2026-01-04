/**
 * Edit Profile Screen - Compact Minimal UI
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    TextInput,
    StatusBar,
} from 'react-native';
import { useAuth } from '../../hooks';
import { useUpdateProfileMutation } from '../../store/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LoadingSpinner } from '../../components/common';

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

interface EditProfileScreenProps {
    navigation: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();

    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const hasChanges =
        firstName.trim() !== (user?.first_name || '') ||
        lastName.trim() !== (user?.last_name || '') ||
        email.trim() !== (user?.email || '');

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Invalid email address';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = useCallback(async () => {
        if (!validate()) return;
        try {
            await updateProfile({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim() || null,
            }).unwrap();
            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error?.data?.detail || 'Failed to update profile');
        }
    }, [firstName, lastName, email, updateProfile, navigation]);

    if (!user) {
        return <LoadingSpinner fullScreen />;
    }

    const initials = (user.full_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isLoading || !hasChanges}
                    style={[styles.saveBtn, (!hasChanges || isLoading) && styles.saveBtnDisabled]}
                >
                    <Text style={[styles.saveBtnText, (!hasChanges || isLoading) && styles.saveBtnTextDisabled]}>
                        {isLoading ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <TouchableOpacity>
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                            style={[styles.input, !!errors.firstName && styles.inputError]}
                            placeholder="Enter first name"
                            placeholderTextColor={COLORS.lightGray}
                            value={firstName}
                            onChangeText={setFirstName}
                        />
                        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter last name"
                            placeholderTextColor={COLORS.lightGray}
                            value={lastName}
                            onChangeText={setLastName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email (Optional)</Text>
                        <TextInput
                            style={[styles.input, !!errors.email && styles.inputError]}
                            placeholder="Enter email address"
                            placeholderTextColor={COLORS.lightGray}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    {/* Phone (read-only) */}
                    <View style={styles.readOnlyGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.readOnlyField}>
                            <Icon name="phone" size={16} color={COLORS.mediumGray} />
                            <Text style={styles.readOnlyText}>{user.phone}</Text>
                        </View>
                        <Text style={styles.hintText}>Phone number cannot be changed</Text>
                    </View>
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
    saveBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: COLORS.accent,
        borderRadius: 8,
    },
    saveBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.white,
    },
    saveBtnDisabled: {
        backgroundColor: COLORS.darkGray,
        opacity: 0.5,
    },
    saveBtnTextDisabled: {
        color: COLORS.lightGray,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.dark,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.white,
    },
    changePhotoText: {
        fontSize: 13,
        color: COLORS.accent,
        fontWeight: '500',
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.mediumGray,
        marginLeft: 4,
    },
    input: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.dark,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        fontSize: 11,
        color: COLORS.error,
        marginLeft: 4,
    },
    readOnlyGroup: {
        gap: 6,
        marginTop: 8,
    },
    readOnlyField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        opacity: 0.7,
    },
    readOnlyText: {
        fontSize: 14,
        color: COLORS.mediumGray,
    },
    hintText: {
        fontSize: 11,
        color: COLORS.lightGray,
        marginLeft: 4,
    },
});

export default EditProfileScreen;
