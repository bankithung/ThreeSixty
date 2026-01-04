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
    update: (id: string, data: any) => api.patch(`/schools/${id}/`, data),
    delete: (id: string) => api.delete(`/schools/${id}/`),
    getStats: (id: string) => api.get(`/schools/${id}/stats/`),
}

// ========== STUDENTS ==========
export const studentsAPI = {
    list: (params?: any) => api.get('/students/', { params }),
    get: (id: string) => api.get(`/students/${id}/`),
    create: (data: any) => api.post('/students/', data),
    update: (id: string, data: any) => api.patch(`/students/${id}/`, data),
    delete: (id: string) => api.delete(`/students/${id}/`),
    uploadFace: (id: string, formData: FormData) =>
        api.post(`/students/${id}/faces/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getFaceEncodings: (id: string) => api.get(`/students/${id}/faces/`),
    enroll: (data: any) => api.post('/students/enroll/', data),
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
    create: (data: any) => api.post('/auth/staff/create/', data),
    update: (id: string, data: any) => api.patch(`/auth/staff/${id}/`, data),
    delete: (id: string) => api.delete(`/auth/staff/${id}/`),
}

// ========== BUSES ==========
export const busesAPI = {
    list: (params?: any) => api.get('/transport/buses/', { params }),
    get: (id: string) => api.get(`/transport/buses/${id}/`),
    create: (data: any) => api.post('/transport/buses/', data),
    update: (id: string, data: any) => api.patch(`/transport/buses/${id}/`, data),
    delete: (id: string) => api.delete(`/transport/buses/${id}/`),
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
    listSubscriptions: () => api.get('/subscriptions/subscriptions/'),
    getMySubscriptions: () => api.get('/subscriptions/subscriptions/my_subscriptions/'),
    createSubscription: (data: any) => api.post('/subscriptions/subscriptions/', data),
    updateSubscription: (id: string, data: any) => api.patch(`/subscriptions/subscriptions/${id}/`, data),
}
