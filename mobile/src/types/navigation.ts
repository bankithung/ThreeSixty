/**
 * Navigation Type Definitions
 */

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ========== ROOT STACK ==========
export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Parent: NavigatorScreenParams<ParentStackParamList>;
    Conductor: NavigatorScreenParams<ConductorStackParamList>;
};

// ========== AUTH STACK ==========
export type AuthStackParamList = {
    Login: undefined;
    OTP: { phone: string };
};

// ========== PARENT NAVIGATION ==========
export type ParentTabParamList = {
    Home: undefined;
    Track: { studentId?: string };
    Notifications: undefined;
    ProfileTab: undefined;
};

export type ParentStackParamList = {
    ParentTabs: NavigatorScreenParams<ParentTabParamList>;
    ChildDetails: { studentId: string };
    Settings: undefined;
    EditProfile: undefined;
    Profile: undefined;
};

// ========== CONDUCTOR NAVIGATION ==========
export type ConductorStackParamList = {
    ConductorHome: undefined;
    StudentList: { tripId: string };
    FaceScan: { tripId: string; eventType: 'checkin' | 'checkout' };
    TripSummary: { tripId: string };
    SOS: { tripId?: string };
    Profile: undefined;
    EditProfile: undefined;
};

// ========== SCREEN PROPS ==========

// Auth screen props
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
    AuthStackParamList,
    T
>;

// Parent tab screen props
export type ParentTabScreenProps<T extends keyof ParentTabParamList> = CompositeScreenProps<
    BottomTabScreenProps<ParentTabParamList, T>,
    NativeStackScreenProps<ParentStackParamList>
>;

// Parent stack screen props (for modal screens)
export type ParentScreenProps<T extends keyof ParentStackParamList> = NativeStackScreenProps<
    ParentStackParamList,
    T
>;

// Conductor screen props
export type ConductorScreenProps<T extends keyof ConductorStackParamList> = NativeStackScreenProps<
    ConductorStackParamList,
    T
>;

// Root screen props
export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
    RootStackParamList,
    T
>;

// ========== NAVIGATION HELPERS ==========

// Type for useNavigation hook
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
