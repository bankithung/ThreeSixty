/**
 * Root Navigator - Handles auth state and role-based navigation
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { useAuth, useAppDispatch } from '../hooks';
import { setCheckingAuth } from '../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadingSpinner } from '../components/common';

import AuthNavigator from './AuthNavigator';
import ParentNavigator from './ParentNavigator';
import ConductorNavigator from './ConductorNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isCheckingAuth } = useAuth();

    // Check auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = await AsyncStorage.getItem('@auth_access_token');
            if (token) {
                // Token exists, RTK Query will fetch profile
                dispatch(setCheckingAuth(true));
            } else {
                dispatch(setCheckingAuth(false));
            }
        };
        checkAuth();
    }, [dispatch]);

    // Show loading while checking auth
    if (isCheckingAuth) {
        return <LoadingSpinner fullScreen text="Loading..." />;
    }

    // Determine which navigator to show based on user role
    const getNavigator = () => {
        if (!isAuthenticated || !user) {
            return <Stack.Screen name="Auth" component={AuthNavigator} />;
        }

        switch (user.role) {
            case 'conductor':
            case 'driver':
                return <Stack.Screen name="Conductor" component={ConductorNavigator} />;
            case 'parent':
            default:
                return <Stack.Screen name="Parent" component={ParentNavigator} />;
        }
    };

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                }}
            >
                {getNavigator()}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
