/**
 * Transport & Trips API endpoints
 */

import apiClient from '../client';
import { Trip, TripTrackingData, Route, Bus, Attendance } from '../../types/models';

export const tripsApi = {
    /**
     * Get active trips
     */
    getActiveTrips: async (): Promise<Trip[]> => {
        const response = await apiClient.get('/transport/trips/active/');
        return response.data;
    },

    /**
     * Get trip details
     */
    getTrip: async (tripId: string): Promise<Trip> => {
        const response = await apiClient.get(`/transport/trips/${tripId}/`);
        return response.data;
    },

    /**
     * Get trip tracking data (for parents)
     */
    getTripTracking: async (tripId: string): Promise<TripTrackingData> => {
        const response = await apiClient.get(`/transport/trips/${tripId}/tracking/`);
        return response.data;
    },

    /**
     * Get active trip for a child
     */
    getChildTrip: async (studentId: string): Promise<{ trip: Trip | null; latest_location: any; student_stop: any }> => {
        const response = await apiClient.get(`/transport/track/child/${studentId}/`);
        return response.data;
    },

    /**
     * Start a trip (conductor)
     */
    startTrip: async (busId: string, routeId: string, tripType: 'morning' | 'evening' | 'special'): Promise<Trip> => {
        const response = await apiClient.post('/transport/trips/start/', {
            bus_id: busId,
            route_id: routeId,
            trip_type: tripType,
        });
        return response.data;
    },

    /**
     * End a trip (conductor)
     */
    endTrip: async (tripId: string): Promise<Trip> => {
        const response = await apiClient.post(`/transport/trips/${tripId}/end/`);
        return response.data;
    },

    /**
     * Update bus location during trip
     */
    updateLocation: async (
        tripId: string,
        latitude: number,
        longitude: number,
        speed?: number,
        heading?: number
    ): Promise<void> => {
        await apiClient.post(`/transport/trips/${tripId}/location/`, {
            latitude,
            longitude,
            speed,
            heading,
        });
    },

    /**
     * Get trip attendance
     */
    getTripAttendance: async (tripId: string): Promise<any> => {
        const response = await apiClient.get(`/attendance/trip/${tripId}/`);
        return response.data;
    },

    /**
     * Get routes for a school
     */
    getRoutes: async (schoolId?: string): Promise<Route[]> => {
        const response = await apiClient.get('/transport/routes/', {
            params: { school_id: schoolId },
        });
        return response.data;
    },

    /**
     * Get buses for a school
     */
    getBuses: async (schoolId?: string): Promise<Bus[]> => {
        const response = await apiClient.get('/transport/buses/', {
            params: { school_id: schoolId },
        });
        return response.data;
    },
};

export default tripsApi;
