import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const refreshToken = localStorage.getItem('refresh_token')
                if (refreshToken) {
                    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
                        refresh: refreshToken,
                    })

                    localStorage.setItem('access_token', data.access)
                    originalRequest.headers.Authorization = `Bearer ${data.access}`
                    return api(originalRequest)
                }
            } catch (refreshError) {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                window.location.href = '/login'
            }
        }

        return Promise.reject(error)
    }
)

export default api

// ========== AUTH ==========
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login/', { email, password }),

    logout: () => api.post('/auth/logout/'),


    getProfile: () => api.get('/auth/profile/'),

    updateProfile: (data: any) => api.patch('/auth/profile/', data),
}

export const accountsAPI = {
    getUserSchools: () => api.get('/auth/schools/'),
}

// ========== SCHOOLS ==========
export const schoolsAPI = {
    list: (params?: any) => api.get('/schools/', { params }),
    get: (id: string) => api.get(`/schools/${id}/`),
    create: (data: any) => api.post('/schools/', data),
    update: (id: string, data: any) => {
        // Check if data is FormData (for file uploads) and set appropriate headers
        const config = data instanceof FormData
            ? { headers: { 'Content-Type': 'multipart/form-data' } }
            : {}
        return api.patch(`/schools/${id}/`, data, config)
    },
    delete: (id: string) => api.delete(`/schools/${id}/`),
    block: (id: string, action: 'block' | 'unblock') => api.post(`/schools/${id}/block/`, { action }),
    getStats: (id: string) => api.get(`/schools/${id}/stats/`),
}

// ========== STUDENTS ==========
export const studentsAPI = {
    list: (params?: any) => api.get('/students/', { params }),
    bulkUpdate: (data: { student_ids: string[], updates: any }) =>
        api.post('/students/bulk-update/', data),

    get: (id: string) => api.get(`/students/${id}/`),
    getComprehensive: (id: string) => api.get(`/students/${id}/comprehensive/`),
    create: (data: any) => api.post('/students/', data),
    update: (id: string, data: any) => api.patch(`/students/${id}/`, data),
    delete: (id: string) => api.delete(`/students/${id}/`),
    uploadFace: (id: string, formData: FormData) =>
        api.post(`/students/${id}/faces/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getFaceEncodings: (id: string) => api.get(`/students/${id}/faces/`),
    enroll: (data: any) => api.post('/students/enroll/', data),
    
    // Comprehensive admission (full workflow)
    admit: (data: any) => api.post('/students/admit/', data),
    
    // Health records
    getHealth: (id: string) => api.get(`/students/${id}/health/`),
    updateHealth: (id: string, data: any) => api.put(`/students/${id}/health/`, data),
    
    // Documents
    getDocuments: (id: string) => api.get(`/students/${id}/documents/`),
    uploadDocument: (id: string, formData: FormData) =>
        api.post(`/students/${id}/documents/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    deleteDocument: (docId: string) => api.delete(`/students/documents/${docId}/`),
    verifyDocument: (docId: string) => 
        api.patch(`/students/documents/${docId}/`, { is_verified: true }),
    
    // Authorized pickups
    getAuthorizedPickups: (id: string) => api.get(`/students/${id}/authorized-pickups/`),
    addAuthorizedPickup: (id: string, formData: FormData) =>
        api.post(`/students/${id}/authorized-pickups/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    updateAuthorizedPickup: (pickupId: string, data: any) =>
        api.patch(`/students/authorized-pickups/${pickupId}/`, data),
    deleteAuthorizedPickup: (pickupId: string) =>
        api.delete(`/students/authorized-pickups/${pickupId}/`),
    
    identifyStudent: (formData: FormData) =>
        api.post('/students/identify/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
}

// ========== PARENTS ==========
export const parentsAPI = {
    list: (params?: any) => api.get('/students/parents/', { params }),
}

// ========== STAFF ==========
export const staffAPI = {
    list: (params?: any) => api.get('/auth/staff/', { params }),
    get: (id: string) => api.get(`/auth/staff/${id}/`),
    create: (data: any) => {
        const config = data instanceof FormData
            ? { headers: { 'Content-Type': 'multipart/form-data' } }
            : {}
        return api.post('/auth/staff/create/', data, config)
    },
    update: (id: string, data: any) => {
        const config = data instanceof FormData
            ? { headers: { 'Content-Type': 'multipart/form-data' } }
            : {}
        return api.patch(`/auth/staff/${id}/`, data, config)
    },
    delete: (id: string) => api.delete(`/auth/staff/${id}/`),
    getTransportAnalytics: (id: string) => api.get(`/transport/staff-analytics/${id}/`),
}

// ========== BUSES ==========
export const busesAPI = {
    list: (params?: any) => api.get('/transport/buses/', { params }),
    get: (id: string) => api.get(`/transport/buses/${id}/`),
    create: (data: any) => api.post('/transport/buses/', data),
    update: (id: string, data: any) => api.patch(`/transport/buses/${id}/`, data),
    delete: (id: string) => api.delete(`/transport/buses/${id}/`),

    // Bus Profile
    getProfile: (id: string) => api.get(`/transport/buses/${id}/profile/`),
    updateProfile: (id: string, data: any) => api.patch(`/transport/buses/${id}/profile/`, data),

    // Fuel Entries
    listFuel: (busId: string) => api.get(`/transport/buses/${busId}/fuel/`),
    addFuel: (busId: string, data: any) => api.post(`/transport/buses/${busId}/fuel/`, data),
    updateFuel: (busId: string, fuelId: string, data: any) =>
        api.patch(`/transport/buses/${busId}/fuel/${fuelId}/`, data),
    deleteFuel: (busId: string, fuelId: string) =>
        api.delete(`/transport/buses/${busId}/fuel/${fuelId}/`),

    // Expenses
    listExpenses: (busId: string, params?: any) =>
        api.get(`/transport/buses/${busId}/expenses/`, { params }),
    addExpense: (busId: string, data: any) =>
        api.post(`/transport/buses/${busId}/expenses/`, data),
    updateExpense: (busId: string, expenseId: string, data: any) =>
        api.patch(`/transport/buses/${busId}/expenses/${expenseId}/`, data),
    deleteExpense: (busId: string, expenseId: string) =>
        api.delete(`/transport/buses/${busId}/expenses/${expenseId}/`),

    // Earnings
    listEarnings: (busId: string) => api.get(`/transport/buses/${busId}/earnings/`),
    addEarning: (busId: string, data: any) =>
        api.post(`/transport/buses/${busId}/earnings/`, data),
    updateEarning: (busId: string, earningId: string, data: any) =>
        api.patch(`/transport/buses/${busId}/earnings/${earningId}/`, data),
    deleteEarning: (busId: string, earningId: string) =>
        api.delete(`/transport/buses/${busId}/earnings/${earningId}/`),

    // Students
    listStudents: (busId: string) => api.get(`/transport/buses/${busId}/students/`),

    // Live Status
    getLiveStatus: (busId: string) => api.get(`/transport/buses/${busId}/live/`),

    // Analytics
    getAnalytics: (busId: string, params?: any) =>
        api.get(`/transport/buses/${busId}/analytics/`, { params }),

    // Image management
    uploadImage: (id: string, formData: FormData) => api.post(`/transport/buses/${id}/upload-image/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteImage: (id: string, imageIndex: number) => api.delete(`/transport/buses/${id}/images/${imageIndex}/`),

    // Student assignment
    assignStudentToStop: (studentId: string, stopId: string) =>
        api.patch(`/students/${studentId}/`, { stop: stopId }),
}

// ========== ROUTES ==========
export const routesAPI = {
    list: (params?: any) => api.get('/transport/routes/', { params }),
    get: (id: string) => api.get(`/transport/routes/${id}/`),
    create: (data: any) => api.post('/transport/routes/', data),
    update: (id: string, data: any) => api.patch(`/transport/routes/${id}/`, data),
    delete: (id: string) => api.delete(`/transport/routes/${id}/`),
    getStops: (id: string) => api.get(`/transport/routes/${id}/stops/`),
    addStop: (routeId: string, data: any) =>
        api.post(`/transport/routes/${routeId}/stops/`, data),
    replaceStops: (routeId: string, stops: any[]) =>
        api.post(`/transport/routes/${routeId}/stops/update/`, { stops }),
}

// ========== TRIPS ==========
export const tripsAPI = {
    list: (params?: any) => api.get('/transport/trips/', { params }),
    get: (id: string) => api.get(`/transport/trips/${id}/`),
    getActive: () => api.get('/transport/trips/active/'),
    getTracking: (id: string) => api.get(`/transport/trips/${id}/tracking/`),
}

// ========== ATTENDANCE ==========
export const attendanceAPI = {
    list: (params?: any) => api.get('/attendance/', { params }),
    getTripAttendance: (tripId: string) => api.get(`/attendance/trip/${tripId}/`),
    getStudentHistory: (studentId: string, days = 30) =>
        api.get(`/attendance/child/${studentId}/history/?days=${days}`),
    getReport: (params: any) => api.get('/attendance/report/', { params }),
}

// ========== EMERGENCY ==========
export const emergencyAPI = {
    list: (params?: any) => api.get('/emergency/alerts/', { params }),
    get: (id: string) => api.get(`/emergency/alerts/${id}/`),
    acknowledge: (id: string) => api.post(`/emergency/alerts/${id}/acknowledge/`),
    resolve: (id: string, data: any) => api.post(`/emergency/alerts/${id}/resolve/`, data),
    getContacts: (schoolId?: string) =>
        api.get('/emergency/contacts/', { params: { school_id: schoolId } }),
    createContact: (data: any) => api.post('/emergency/contacts/', data),
    updateContact: (id: string, data: any) => api.patch(`/emergency/contacts/${id}/`, data),
    deleteContact: (id: string) => api.delete(`/emergency/contacts/${id}/`),
}

// ========== NOTIFICATIONS ==========
export const notificationsAPI = {
    list: (params?: any) => api.get('/notifications/', { params }),
    send: (data: any) => api.post('/notifications/send/', data),
}

// ========== REPORTS ==========
export const reportsAPI = {
    getDashboard: (schoolId?: string) =>
        api.get('/schools/dashboard/', { params: { school_id: schoolId } }),
    getAttendanceReport: (params: any) => api.get('/attendance/report/', { params }),
    getTripReport: (params: any) => api.get('/transport/trips/report/', { params }),
}

// ========== SUBSCRIPTIONS ==========
export const subscriptionsAPI = {
    listFeatures: () => api.get('/subscriptions/features/'),
    getFeature: (id: string) => api.get(`/subscriptions/features/${id}/`),
    createFeature: (data: any) => api.post('/subscriptions/features/', data),
    updateFeature: (id: string, data: any) => api.patch(`/subscriptions/features/${id}/`, data),
    deleteFeature: (id: string) => api.delete(`/subscriptions/features/${id}/`),

    listSubscriptions: (params?: any) => api.get('/subscriptions/subscriptions/', { params }),
    getMySubscriptions: () => api.get('/subscriptions/subscriptions/my_subscriptions/'),
    createSubscription: (data: any) => api.post('/subscriptions/subscriptions/', data),
    updateSubscription: (id: string, data: any) => api.patch(`/subscriptions/subscriptions/${id}/`, data),
}

export const transactionsAPI = {
    list: (params?: any) => api.get('/subscriptions/transactions/', { params }),
    stats: () => api.get('/subscriptions/transactions/stats/'),
    create: (data: any) => api.post('/subscriptions/transactions/', data),
    update: (id: string, data: any) => api.patch(`/subscriptions/transactions/${id}/`, data),
}
