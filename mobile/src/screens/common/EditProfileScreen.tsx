/**
 * Edit Profile Screen
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
} from 'react-native';
import { useAuth } from '../../hooks';
import { useUpdateProfileMutation } from '../../store/api';
import { colors } from '../../constants/colors';
import { theme } from '../../constants/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button, Input, Avatar, LoadingSpinner } from '../../components/common';

interface EditProfileScreenProps {
    navigation: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
    const { user, refetchProfile } = useAuth();
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();

    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="arrow-back" size={24} color={colors.primary} />
                        <Text style={[styles.backText, { marginLeft: 4 }]}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Profile</Text>
                    <View style={{ width: 50 }} />
                </View>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <Avatar
                        source={user.avatar}
                        name={user.full_name}
                        size="large"
                    />
                    <TouchableOpacity style={styles.changePhotoBtn}>
                        <Text style={styles.changePhotoText}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Input
                        label="First Name"
                        placeholder="Enter first name"
                        value={firstName}
                        onChangeText={setFirstName}
                        error={errors.firstName}
                    />

                    <Input
                        label="Last Name"
                        placeholder="Enter last name"
                        value={lastName}
                        onChangeText={setLastName}
                    />

                    <Input
                        label="Email (Optional)"
                        placeholder="Enter email address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={errors.email}
                    />

                    {/* Phone (read-only) */}
                    <View style={styles.readOnlyField}>
                        <Text style={styles.fieldLabel}>Phone Number</Text>
                        <Text style={styles.fieldValue}>{user.phone}</Text>
                        <Text style={styles.fieldHint}>Phone number cannot be changed</Text>
                    </View>
                </View>

                {/* Save Button */}
                <Button
                    title="Save Changes"
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.saveButton}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    backText: {
        fontSize: theme.typography.fontSize.md,
        color: colors.primary,
        fontWeight: '500',
    },
    title: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    changePhotoBtn: {
        marginTop: theme.spacing.md,
    },
    changePhotoText: {
        color: colors.primary,
        fontSize: theme.typography.fontSize.md,
        fontWeight: '500',
    },
    form: {
        marginBottom: theme.spacing.xl,
    },
    readOnlyField: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    fieldLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    fieldValue: {
        fontSize: theme.typography.fontSize.md,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    fieldHint: {
        fontSize: theme.typography.fontSize.xs,
        color: colors.textHint,
        marginTop: theme.spacing.xs,
    },
    saveButton: {
        marginTop: theme.spacing.lg,
    },
});

export default EditProfileScreen;
