/**
 * Conductor Navigation Stack
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ConductorStackParamList } from '../types/navigation';
import {
    ConductorHomeScreen,
    StudentListScreen,
    FaceScanScreen,
    TripSummaryScreen,
} from '../screens/conductor';
import { ProfileScreen, SOSScreen, EditProfileScreen } from '../screens/common';

const Stack = createNativeStackNavigator<ConductorStackParamList>();

const ConductorNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="ConductorHome" component={ConductorHomeScreen} />
            <Stack.Screen name="StudentList" component={StudentListScreen} />
            <Stack.Screen
                name="FaceScan"
                component={FaceScanScreen}
                options={{
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen
                name="TripSummary"
                component={TripSummaryScreen}
                options={{
                    animation: 'fade',
                }}
            />
            <Stack.Screen
                name="SOS"
                component={SOSScreen}
                options={{
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: true, title: 'Edit Profile' }}
            />
        </Stack.Navigator>
    );
};

export default ConductorNavigator;

