/**
 * Parent Navigation - Professional Tab Navigator with Animations
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
    ParentStackParamList,
    ParentTabParamList,
} from '../types/navigation';
import {
    ParentHomeScreen,
    TrackingScreen,
    NotificationsScreen,
    ChildDetailsScreen,
    FeesScreen,
} from '../screens/parent';
import { ProfileScreen, EditProfileScreen } from '../screens/common';
import { useGetUnreadCountQuery } from '../store/api';

const Tab = createBottomTabNavigator<ParentTabParamList>();
const Stack = createNativeStackNavigator<ParentStackParamList>();

// Professional muted color palette
const COLORS = {
    dark: '#1a1a2e',
    mediumGray: '#4a4a68',
    lightGray: '#9ca3af',
    surface: '#ffffff',
    background: '#f8f9fa',
    accent: '#1a1a2e',
    border: '#e5e7eb',
};

// Animated Tab Icon Component
const AnimatedTabIcon: React.FC<{
    name: string;
    focused: boolean;
    label: string;
    badge?: number;
}> = ({ name, focused, label, badge }) => {
    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: withSpring(focused ? 1.1 : 1, { damping: 15, stiffness: 150 }) },
        ],
    }));

    const animatedContainerStyle = useAnimatedStyle(() => ({
        backgroundColor: withTiming(focused ? `${COLORS.dark}10` : 'transparent', { duration: 200 }),
    }));

    const animatedLabelStyle = useAnimatedStyle(() => ({
        opacity: withTiming(focused ? 1 : 0.6, { duration: 200 }),
        transform: [
            { translateY: withSpring(focused ? 0 : 2, { damping: 15 }) },
        ],
    }));

    return (
        <View style={styles.tabItemContainer}>
            <Animated.View style={[styles.iconContainer, animatedContainerStyle]}>
                <Animated.View style={animatedIconStyle}>
                    <Icon
                        name={name}
                        size={22}
                        color={focused ? COLORS.dark : COLORS.lightGray}
                    />
                </Animated.View>
                {badge !== undefined && badge > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {badge > 9 ? '9+' : badge}
                        </Text>
                    </View>
                )}
            </Animated.View>
            <Animated.Text style={[
                styles.tabLabel,
                { color: focused ? COLORS.dark : COLORS.lightGray },
                animatedLabelStyle,
            ]}>
                {label}
            </Animated.Text>
        </View>
    );
};

// Parent Tab Navigator
const ParentTabNavigator: React.FC = () => {
    const { data: unreadData } = useGetUnreadCountQuery(undefined, {
        pollingInterval: 60000,
    });

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="Home"
                component={ParentHomeScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon name="home" focused={focused} label="Home" />
                    ),
                }}
            />
            <Tab.Screen
                name="Track"
                component={TrackingScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon name="location-on" focused={focused} label="Track" />
                    ),
                }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon
                            name="notifications"
                            focused={focused}
                            label="Alerts"
                            badge={unreadData?.unread_count}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={View}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Profile');
                    },
                })}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AnimatedTabIcon name="person" focused={focused} label="Profile" />
                    ),
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
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Fees" component={FeesScreen} />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        height: Platform.OS === 'ios' ? 85 : 70,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        elevation: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tabItemContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    iconContainer: {
        width: 44,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        position: 'relative',
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: 2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#ffffff',
    },
});

export default ParentNavigator;
