/**
 * Authentication Redux Slice - Enhanced with RTK Query integration
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/models';
import { api } from '../api';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isCheckingAuth: boolean;
    otpSent: boolean;
    otpPhone: string | null;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isCheckingAuth: true,
    otpSent: false,
    otpPhone: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCheckingAuth: (state, action: PayloadAction<boolean>) => {
            state.isCheckingAuth = action.payload;
        },
        setAuthenticated: (state, action: PayloadAction<{ user: User; isAuthenticated: boolean }>) => {
            state.user = action.payload.user;
            state.isAuthenticated = action.payload.isAuthenticated;
            state.isCheckingAuth = false;
        },
        setOTPSent: (state, action: PayloadAction<string>) => {
            state.otpSent = true;
            state.otpPhone = action.payload;
        },
        clearOTP: (state) => {
            state.otpSent = false;
            state.otpPhone = null;
        },
        clearAuth: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isCheckingAuth = false;
            state.otpSent = false;
            state.otpPhone = null;
        },
    },
    extraReducers: (builder) => {
        // Handle getProfile success
        builder.addMatcher(
            api.endpoints.getProfile.matchFulfilled,
            (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.isCheckingAuth = false;
            }
        );

        // Handle getProfile error (not authenticated)
        builder.addMatcher(
            api.endpoints.getProfile.matchRejected,
            (state, action) => {
                state.isCheckingAuth = false;
                if ((action.payload as any)?.status === 401) {
                    state.isAuthenticated = false;
                    state.user = null;
                }
            }
        );

        // Handle verifyOTP success
        builder.addMatcher(
            api.endpoints.verifyOTP.matchFulfilled,
            (state, action) => {
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.otpSent = false;
                state.otpPhone = null;
            }
        );

        // Handle logout
        builder.addMatcher(
            api.endpoints.logout.matchFulfilled,
            (state) => {
                state.user = null;
                state.isAuthenticated = false;
            }
        );

        // Handle profile update
        builder.addMatcher(
            api.endpoints.updateProfile.matchFulfilled,
            (state, action) => {
                state.user = action.payload;
            }
        );
    },
});

export const {
    setCheckingAuth,
    setAuthenticated,
    setOTPSent,
    clearOTP,
    clearAuth
} = authSlice.actions;

export default authSlice.reducer;
