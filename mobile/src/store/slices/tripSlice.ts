/**
 * Trip Redux Slice - Enhanced for real-time tracking
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Trip, LocationData, Student } from '../../types/models';
import { api } from '../api';

interface TripState {
    // Selected child for tracking
    selectedChildId: string | null;

    // Current active trip for conductor
    currentTrip: Trip | null;

    // Real-time location (from WebSocket)
    liveLocation: LocationData | null;

    // WebSocket connection status
    wsConnected: boolean;

    // Trip students attendance status
    studentsAttendance: Array<{
        student: Student;
        checkin: any;
        checkout: any;
        status: 'not_boarded' | 'on_bus' | 'dropped';
    }>;
}

const initialState: TripState = {
    selectedChildId: null,
    currentTrip: null,
    liveLocation: null,
    wsConnected: false,
    studentsAttendance: [],
};

const tripSlice = createSlice({
    name: 'trip',
    initialState,
    reducers: {
        selectChild: (state, action: PayloadAction<string>) => {
            state.selectedChildId = action.payload;
        },

        setCurrentTrip: (state, action: PayloadAction<Trip | null>) => {
            state.currentTrip = action.payload;
        },

        updateLiveLocation: (state, action: PayloadAction<LocationData>) => {
            state.liveLocation = action.payload;
        },

        setWsConnected: (state, action: PayloadAction<boolean>) => {
            state.wsConnected = action.payload;
        },

        clearLiveLocation: (state) => {
            state.liveLocation = null;
            state.wsConnected = false;
        },

        updateStudentStatus: (state, action: PayloadAction<{
            studentId: string;
            status: 'not_boarded' | 'on_bus' | 'dropped';
            attendance?: any;
        }>) => {
            const { studentId, status, attendance } = action.payload;
            const student = state.studentsAttendance.find(s => s.student.id === studentId);
            if (student) {
                student.status = status;
                if (status === 'on_bus') {
                    student.checkin = attendance;
                } else if (status === 'dropped') {
                    student.checkout = attendance;
                }
            }
        },

        incrementTripCounter: (state, action: PayloadAction<{ field: 'boarded' | 'dropped' }>) => {
            if (state.currentTrip) {
                if (action.payload.field === 'boarded') {
                    state.currentTrip.students_boarded += 1;
                } else {
                    state.currentTrip.students_dropped += 1;
                }
            }
        },
    },
    extraReducers: (builder) => {
        // Auto-select first child when children are loaded
        builder.addMatcher(
            api.endpoints.getChildren.matchFulfilled,
            (state, action) => {
                if (!state.selectedChildId && action.payload.length > 0) {
                    state.selectedChildId = action.payload[0].id;
                }
            }
        );

        // Set trip attendance when loaded
        builder.addMatcher(
            api.endpoints.getTripAttendance.matchFulfilled,
            (state, action) => {
                state.studentsAttendance = action.payload.students || [];
            }
        );

        // Update current trip on start
        builder.addMatcher(
            api.endpoints.startTrip.matchFulfilled,
            (state, action) => {
                state.currentTrip = action.payload;
            }
        );

        // Update current trip on end
        builder.addMatcher(
            api.endpoints.endTrip.matchFulfilled,
            (state, action) => {
                state.currentTrip = action.payload;
            }
        );

        // Update student status on attendance
        builder.addMatcher(
            api.endpoints.manualAttendance.matchFulfilled,
            (state, action) => {
                const { attendance } = action.payload;
                const studentIndex = state.studentsAttendance.findIndex(
                    s => s.student.id === attendance.student
                );
                if (studentIndex !== -1) {
                    if (attendance.event_type === 'checkin') {
                        state.studentsAttendance[studentIndex].checkin = attendance;
                        state.studentsAttendance[studentIndex].status = 'on_bus';
                    } else {
                        state.studentsAttendance[studentIndex].checkout = attendance;
                        state.studentsAttendance[studentIndex].status = 'dropped';
                    }
                }
                // Update trip counters
                if (state.currentTrip) {
                    if (attendance.event_type === 'checkin') {
                        state.currentTrip.students_boarded += 1;
                    } else {
                        state.currentTrip.students_dropped += 1;
                    }
                }
            }
        );
    },
});

export const {
    selectChild,
    setCurrentTrip,
    updateLiveLocation,
    setWsConnected,
    clearLiveLocation,
    updateStudentStatus,
    incrementTripCounter,
} = tripSlice.actions;

export default tripSlice.reducer;
