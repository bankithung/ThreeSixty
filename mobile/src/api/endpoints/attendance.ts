/**
 * Attendance API endpoints
 */

import apiClient from '../client';
import { Attendance } from '../../types/models';

export const attendanceApi = {
    /**
     * Face scan check-in
     */
    faceCheckin: async (
        tripId: string,
        photo: FormData,
        latitude?: number,
        longitude?: number
    ): Promise<{ message: string; attendance: Attendance }> => {
        const formData = new FormData();
        formData.append('trip_id', tripId);
        formData.append('photo', photo.get('photo') as Blob);
        if (latitude) formData.append('latitude', latitude.toString());
        if (longitude) formData.append('longitude', longitude.toString());

        const response = await apiClient.post('/attendance/checkin/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Face scan check-out
     */
    faceCheckout: async (
        tripId: string,
        photo: FormData,
        latitude?: number,
        longitude?: number
    ): Promise<{ message: string; attendance: Attendance }> => {
        const formData = new FormData();
        formData.append('trip_id', tripId);
        formData.append('photo', photo.get('photo') as Blob);
        if (latitude) formData.append('latitude', latitude.toString());
        if (longitude) formData.append('longitude', longitude.toString());

        const response = await apiClient.post('/attendance/checkout/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Manual attendance marking
     */
    manualAttendance: async (
        tripId: string,
        studentId: string,
        eventType: 'checkin' | 'checkout',
        latitude?: number,
        longitude?: number,
        notes?: string
    ): Promise<{ message: string; attendance: Attendance }> => {
        const response = await apiClient.post('/attendance/manual/', {
            trip_id: tripId,
            student_id: studentId,
            event_type: eventType,
            latitude,
            longitude,
            notes,
        });
        return response.data;
    },
};

export default attendanceApi;
