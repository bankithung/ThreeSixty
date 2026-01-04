/**
 * Students API endpoints
 */

import apiClient from '../client';
import { Student, ChildStatus, Attendance, PaginatedResponse } from '../../types/models';

export const studentsApi = {
    /**
     * Get parent's children
     */
    getMyChildren: async (): Promise<Student[]> => {
        const response = await apiClient.get('/students/parent/children/');
        return response.data;
    },

    /**
     * Get child's current status
     */
    getChildStatus: async (studentId: string): Promise<ChildStatus> => {
        const response = await apiClient.get(`/attendance/child/${studentId}/status/`);
        return response.data;
    },

    /**
     * Get child's attendance history
     */
    getChildHistory: async (studentId: string, days: number = 7): Promise<Attendance[]> => {
        const response = await apiClient.get(`/attendance/child/${studentId}/history/`, {
            params: { days },
        });
        return response.data;
    },

    /**
     * Get students for conductor (on a route)
     */
    getConductorStudents: async (routeId: string): Promise<Student[]> => {
        const response = await apiClient.get('/students/conductor/list/', {
            params: { route_id: routeId },
        });
        return response.data;
    },

    /**
     * Get student details
     */
    getStudent: async (studentId: string): Promise<Student> => {
        const response = await apiClient.get(`/students/${studentId}/`);
        return response.data;
    },
};

export default studentsApi;
