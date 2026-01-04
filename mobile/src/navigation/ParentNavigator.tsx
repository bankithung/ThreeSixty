/**
 * Parent Navigation - Tab Navigator + Stack
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import {
    ParentStackParamList,
    ParentTabParamList,
} from '../types/navigation';
import {
    ParentHomeScreen,
    TrackingScreen,
    NotificationsScreen,
    ChildDetailsScreen,
} from '../screens/parent';
import { ProfileScreen, EditProfileScreen } from '../screens/common';
import { colors } from '../constants/colors';
import { useGetUnreadCountQuery } from '../store/api';

const Tab = createBottomTabNavigator<ParentTabParamList>();
const Stack = createNativeStackNavigator<ParentStackParamList>();

import Icon from 'react-native-vector-icons/MaterialIcons';

// ... (imports remain)

// Tab Icon Component
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
        <Icon name={name} size={24} color={focused ? colors.primary : colors.textHint} />
    </View>
);

// Parent Tab Navigator
const ParentTabNavigator: React.FC = () => {
    const { data: unreadData } = useGetUnreadCountQuery(undefined, {
        pollingInterval: 60000,
    });

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textHint,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tab.Screen
                name="Home"
                component={ParentHomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Track"
                component={TrackingScreen}
                options={{
                    tabBarLabel: 'Track',
                    tabBarIcon: ({ focused }) => <TabIcon name="location-on" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    tabBarLabel: 'Alerts',
                    tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
                    tabBarBadge: unreadData?.unread_count && unreadData.unread_count > 0
                        ? unreadData.unread_count > 9 ? '9+' : unreadData.unread_count
                        : undefined,
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={View} // Dummy component
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        // Prevent default action
                        e.preventDefault();
                        // Navigate to the Profile stack screen
                        navigation.navigate('Profile');
                    },
                })}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
                }}
            />
        </Tab.Navigator>
    );
};

// Parent Stack Navigator
const ParentNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="ParentTabs" component={ParentTabNavigator} />
            <Stack.Screen name="ChildDetails" component={ChildDetailsScreen} />
            <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: true, title: 'Edit Profile' }}
            />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerShown: false, title: 'Profile' }}
            />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        height: 90, // Massive Increase
        paddingBottom: 24,
        paddingTop: 16,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    iconContainer: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
    },
    iconFocused: {
        backgroundColor: colors.indigo50,
    },
    icon: {
        fontSize: 30, // Much larger icons
    },
});

export default ParentNavigator;
