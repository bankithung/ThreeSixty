/**
 * Custom hook for authentication flow
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCheckingAuth, clearAuth, setOTPSent, clearOTP } from '../store/slices/authSlice';
import { clearTripState } from '../store/slices/tripSlice';
import { clearNotificationState } from '../store/slices/notificationSlice';
import {
    useGetProfileQuery,
    useSendOTPMutation,
    useVerifyOTPMutation,
    useLogoutMutation,
    api,
} from '../store/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isCheckingAuth, otpSent, otpPhone } = useAppSelector(
        (state) => state.auth
    );

    // Check for existing token and fetch profile
    const {
        data: profile,
        isLoading: isLoadingProfile,
        error: profileError,
        refetch: refetchProfile,
    } = useGetProfileQuery(undefined, {
        skip: !isAuthenticated && !isCheckingAuth,
    });

    const [sendOTPMutation, { isLoading: isSendingOTP, error: sendOTPError }] = useSendOTPMutation();
    const [verifyOTPMutation, { isLoading: isVerifyingOTP, error: verifyOTPError }] = useVerifyOTPMutation();
    const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();



    // Update checking auth when profile loads
    useEffect(() => {
        if (!isLoadingProfile && isCheckingAuth) {
            dispatch(setCheckingAuth(false));
        }
    }, [isLoadingProfile, isCheckingAuth, dispatch]);

    const sendOTP = useCallback(
        async (phone: string) => {
            try {
                await sendOTPMutation({ phone }).unwrap();
                dispatch(setOTPSent(phone));
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error?.data?.message || 'Failed to send OTP' };
            }
        },
        [sendOTPMutation, dispatch]
    );

    const verifyOTP = useCallback(
        async (phone: string, otp: string, fcmToken?: string) => {
            try {
                const result = await verifyOTPMutation({ phone, otp, fcmToken }).unwrap();
                dispatch(clearOTP());
                return { success: true, user: result.user, isNewUser: result.is_new_user };
            } catch (error: any) {
                return { success: false, error: error?.data?.otp?.[0] || 'Invalid OTP' };
            }
        },
        [verifyOTPMutation, dispatch]
    );

    const logout = useCallback(async () => {
        try {
            await logoutMutation().unwrap();
        } catch (error) {
            // Ignore logout errors
        } finally {
            // Clear all Redux state
            dispatch(clearAuth());
            dispatch(clearTripState());
            dispatch(clearNotificationState());
            dispatch(api.util.resetApiState());

            // Optional: Clear AsyncStorage if you store anything else
            // await AsyncStorage.clear(); 
        }
    }, [logoutMutation, dispatch]);

    const resendOTP = useCallback(async () => {
        if (otpPhone) {
            return sendOTP(otpPhone);
        }
        return { success: false, error: 'No phone number' };
    }, [otpPhone, sendOTP]);

    return {
        user: profile || user,
        isAuthenticated,
        isCheckingAuth: isCheckingAuth || (isLoadingProfile && !user),
        otpSent,
        otpPhone,

        // Actions
        sendOTP,
        verifyOTP,
        logout,
        resendOTP,
        refetchProfile,

        // Loading states
        isSendingOTP,
        isVerifyingOTP,
        isLoggingOut,

        // Errors
        sendOTPError: (sendOTPError as any)?.data?.message,
        verifyOTPError: (verifyOTPError as any)?.data?.otp?.[0],
    };
};

export default useAuth;
