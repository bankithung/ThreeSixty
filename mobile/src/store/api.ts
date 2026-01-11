/**
 * RTK Query API - Provides caching, auto-refetching, and seamless data management
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';
import {
    User,
    SchoolMembership,
    Student,
    ChildStatus,
    Attendance,
    Trip,
    TripTrackingData,
    Route,
    Bus,
    Notification,
    AuthResponse,
} from '../types/models';

// Custom base query with auth header
const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers, { endpoint }) => {
        // Skip auth token for public endpoints to avoid 401s from invalid tokens
        if (endpoint === 'sendOTP' || endpoint === 'verifyOTP') {
            return headers;
        }

        const token = await AsyncStorage.getItem('@auth_access_token');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

// Mutex to prevent multiple refresh requests
let refreshPromise: Promise<any> | null = null;

// Base query with re-auth on 401
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
    let result = await baseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        if (!refreshPromise) {
            refreshPromise = (async () => {
                try {
                    const refreshToken = await AsyncStorage.getItem('@auth_refresh_token');
                    if (refreshToken) {
                        const refreshResult = await baseQuery(
                            {
                                url: '/auth/refresh/',
                                method: 'POST',
                                body: { refresh: refreshToken },
                            },
                            api,
                            extraOptions
                        );

                        if (refreshResult.data) {
                            const { access } = refreshResult.data as { access: string };
                            await AsyncStorage.setItem('@auth_access_token', access);
                            return true;
                        }
                    }
                    return false;
                } catch (e) {
                    return false;
                } finally {
                    refreshPromise = null;
                }
            })();
        }

        const success = await refreshPromise;

        if (success) {
            // Retry original request
            result = await baseQuery(args, api, extraOptions);
        }
    }

    return result;
};

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['User', 'Children', 'Trip', 'Attendance', 'Notification', 'Route', 'Bus'],
    endpoints: (builder) => ({
        // ========== AUTH ==========
        getProfile: builder.query<User, void>({
            query: () => '/auth/profile/',
            providesTags: ['User'],
        }),

        getUserSchools: builder.query<SchoolMembership[], void>({
            query: () => '/auth/schools/',
        }),

        updateProfile: builder.mutation<User, Partial<User>>({
            query: (data) => ({
                url: '/auth/profile/',
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['User'],
        }),

        sendOTP: builder.mutation<{ message: string; phone: string }, { phone: string }>({
            query: ({ phone }) => ({
                url: '/auth/send-otp/',
                method: 'POST',
                body: { phone, purpose: 'login' },
            }),
        }),

        verifyOTP: builder.mutation<AuthResponse, { phone: string; otp: string; fcmToken?: string }>({
            query: ({ phone, otp, fcmToken }) => ({
                url: '/auth/verify-otp/',
                method: 'POST',
                body: { phone, otp, fcm_token: fcmToken, device_type: 'android' },
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    await AsyncStorage.multiSet([
                        ['@auth_access_token', data.access],
                        ['@auth_refresh_token', data.refresh],
                    ]);
                } catch { }
            },
        }),

        logout: builder.mutation<void, void>({
            query: () => ({
                url: '/auth/logout/',
                method: 'POST',
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    await queryFulfilled;
                } finally {
                    await AsyncStorage.multiRemove(['@auth_access_token', '@auth_refresh_token']);
                }
            },
        }),

        updateFCMToken: builder.mutation<void, { fcmToken: string; deviceType: string }>({
            query: ({ fcmToken, deviceType }) => ({
                url: '/auth/fcm-token/',
                method: 'POST',
                body: { fcm_token: fcmToken, device_type: deviceType },
            }),
        }),

        // ========== CHILDREN (Parent) ==========
        getChildren: builder.query<Student[], void>({
            query: () => '/students/parent/children/',
            transformResponse: (response: { results: Student[] }) => response.results,
            providesTags: ['Children'],
        }),

        getChildStatus: builder.query<ChildStatus, string>({
            query: (studentId) => `/attendance/child/${studentId}/status/`,
            providesTags: (result, error, id) => [{ type: 'Attendance', id }],
        }),

        getChildHistory: builder.query<Attendance[], { studentId: string; days?: number }>({
            query: ({ studentId, days = 7 }) => `/attendance/child/${studentId}/history/?days=${days}`,
            transformResponse: (response: any) => {
                // Handle both paginated and array responses
                if (Array.isArray(response)) return response;
                if (response?.results) return response.results;
                return [];
            },
            providesTags: ['Attendance'],
        }),

        getChildTrip: builder.query<{ trip: Trip | null; latest_location: any; student_stop: any }, string>({
            query: (studentId) => `/transport/track/child/${studentId}/`,
            providesTags: (result, error, id) => [{ type: 'Trip', id }],
        }),

        // ========== TRIPS ==========
        getActiveTrips: builder.query<Trip[], void>({
            query: () => '/transport/trips/active/',
            transformResponse: (response: any) => response.results || response,
            providesTags: ['Trip'],
        }),

        getTripHistory: builder.query<{
            results: Trip[];
            total_count: number;
            completed_count: number;
            today_count: number;
            page: number;
            has_next: boolean;
        }, { page?: number; status?: string } | void>({
            query: (params) => {
                const page = params && 'page' in params ? params.page : 1;
                const status = params && 'status' in params ? params.status : undefined;
                return `/transport/trips/history/?page=${page}${status ? `&status=${status}` : ''}`;
            },
            providesTags: ['Trip'],
        }),

        getTripTracking: builder.query<TripTrackingData, string>({
            query: (tripId) => `/transport/trips/${tripId}/tracking/`,
            providesTags: (result, error, id) => [{ type: 'Trip', id }],
        }),

        startTrip: builder.mutation<Trip, { busId: string; routeId: string; tripType: string }>({
            query: ({ busId, routeId, tripType }) => ({
                url: '/transport/trips/start/',
                method: 'POST',
                body: { bus_id: busId, route_id: routeId, trip_type: tripType },
            }),
            invalidatesTags: ['Trip'],
        }),

        endTrip: builder.mutation<Trip, string>({
            query: (tripId) => ({
                url: `/transport/trips/${tripId}/end/`,
                method: 'POST',
            }),
            invalidatesTags: ['Trip'],
        }),

        updateLocation: builder.mutation<void, { tripId: string; latitude: number; longitude: number; speed?: number; heading?: number }>({
            query: ({ tripId, ...body }) => ({
                url: `/transport/trips/${tripId}/location/`,
                method: 'POST',
                body,
            }),
        }),

        getTripAttendance: builder.query<any, string>({
            query: (tripId) => `/attendance/trip/${tripId}/`,
            providesTags: (result, error, id) => [{ type: 'Attendance', id }],
        }),

        // ========== ROUTES & BUSES ==========
        getRoutes: builder.query<Route[], string | undefined>({
            query: (schoolId) => `/transport/routes/${schoolId ? `?school_id=${schoolId}` : '?limit=100'}`,
            transformResponse: (response: any) => response.results || response,
            providesTags: ['Route'],
        }),

        getBuses: builder.query<Bus[], string | undefined>({
            query: (schoolId) => `/transport/buses/${schoolId ? `?school_id=${schoolId}` : '?limit=100'}`,
            transformResponse: (response: any) => response.results || response,
            providesTags: ['Bus'],
        }),

        getConductorStudents: builder.query<Student[], string>({
            query: (routeId) => `/students/conductor/list/?route_id=${routeId}&limit=100`,
            transformResponse: (response: any) => response.results || response,
        }),

        // ========== ATTENDANCE ==========
        faceCheckin: builder.mutation<{ message: string; attendance: Attendance }, FormData>({
            query: (formData) => ({
                url: '/attendance/checkin/',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['Attendance', 'Trip'],
        }),

        faceCheckout: builder.mutation<{ message: string; attendance: Attendance }, FormData>({
            query: (formData) => ({
                url: '/attendance/checkout/',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['Attendance', 'Trip'],
        }),

        manualAttendance: builder.mutation<{ message: string; attendance: Attendance }, {
            tripId: string;
            studentId: string;
            eventType: string;
            latitude?: number;
            longitude?: number;
            notes?: string;
        }>({
            query: (data) => ({
                url: '/attendance/manual/',
                method: 'POST',
                body: {
                    trip_id: data.tripId,
                    student_id: data.studentId,
                    event_type: data.eventType,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    notes: data.notes,
                },
            }),
            invalidatesTags: ['Attendance', 'Trip'],
        }),

        // ========== NOTIFICATIONS ==========
        getNotifications: builder.query<Notification[], { limit?: number; isRead?: boolean }>({
            query: ({ limit = 50, isRead }) => {
                let url = `/notifications/?limit=${limit}`;
                if (isRead !== undefined) url += `&is_read=${isRead}`;
                return url;
            },
            transformResponse: (response: any) => response.results || response,
            providesTags: ['Notification'],
        }),

        getUnreadCount: builder.query<{ unread_count: number }, void>({
            query: () => '/notifications/unread-count/',
            providesTags: ['Notification'],
        }),

        markNotificationRead: builder.mutation<Notification, string>({
            query: (id) => `/notifications/${id}/`,
            invalidatesTags: ['Notification'],
        }),

        markAllRead: builder.mutation<{ message: string }, void>({
            query: () => ({
                url: '/notifications/mark-all-read/',
                method: 'POST',
            }),
            invalidatesTags: ['Notification'],
        }),

        // ========== EMERGENCY ==========
        raiseEmergency: builder.mutation<{ message: string; alert: any }, {
            emergencyType: string;
            tripId?: string;
            latitude?: number;
            longitude?: number;
            description?: string;
        }>({
            query: (data) => ({
                url: '/emergency/alerts/raise_alert/',
                method: 'POST',
                body: {
                    emergency_type: data.emergencyType,
                    trip_id: data.tripId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    description: data.description,
                },
            }),
        }),

        getEmergencyContacts: builder.query<any[], void>({
            query: () => '/emergency/alerts/my_contacts/',
        }),

        getActiveEmergencies: builder.query<any[], void>({
            query: () => '/emergency/alerts/?active=true',
        }),

        acknowledgeEmergency: builder.mutation<any, string>({
            query: (alertId) => ({
                url: `/emergency/alerts/${alertId}/acknowledge/`,
                method: 'POST',
            }),
        }),

        resolveEmergency: builder.mutation<any, { alertId: string; notes?: string; status?: string }>({
            query: ({ alertId, notes, status }) => ({
                url: `/emergency/alerts/${alertId}/resolve/`,
                method: 'POST',
                body: { resolution_notes: notes, status },
            }),
        }),

        // ========== ROUTE DETAILS ==========
        getRouteDetails: builder.query<{
            route: Route;
            stops: any[];
            polyline: string | null;
        }, string>({
            query: (routeId) => `/transport/routes/${routeId}/details/`,
            providesTags: (result, error, id) => [{ type: 'Route', id }],
        }),

        getRouteStops: builder.query<any[], string>({
            query: (routeId) => `/transport/routes/${routeId}/stops/`,
        }),
    }),
});

// Export hooks for usage in components
export const {
    // Auth
    useGetProfileQuery,
    useGetUserSchoolsQuery,
    useUpdateProfileMutation,
    useSendOTPMutation,
    useVerifyOTPMutation,
    useLogoutMutation,
    useUpdateFCMTokenMutation,
    // Children
    useGetChildrenQuery,
    useGetChildStatusQuery,
    useGetChildHistoryQuery,
    useGetChildTripQuery,
    // Trips
    useGetActiveTripsQuery,
    useGetTripHistoryQuery,
    useGetTripTrackingQuery,
    useStartTripMutation,
    useEndTripMutation,
    useUpdateLocationMutation,
    useGetTripAttendanceQuery,
    // Routes & Buses
    useGetRoutesQuery,
    useGetBusesQuery,
    useGetConductorStudentsQuery,
    // Attendance
    useFaceCheckinMutation,
    useFaceCheckoutMutation,
    useManualAttendanceMutation,
    // Notifications
    useGetNotificationsQuery,
    useGetUnreadCountQuery,
    useMarkNotificationReadMutation,
    useMarkAllReadMutation,
    // Emergency
    useRaiseEmergencyMutation,
    useGetEmergencyContactsQuery,
    useGetActiveEmergenciesQuery,
    useAcknowledgeEmergencyMutation,
    useResolveEmergencyMutation,
    // Route Details
    useGetRouteDetailsQuery,
    useGetRouteStopsQuery,
} = api;
