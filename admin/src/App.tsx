import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Schools from './pages/Schools'
import SchoolDetail from './pages/SchoolDetail'
import Students from './pages/Students'
import StudentDetail from './pages/StudentDetail'
import Staff from './pages/Staff'
import Parents from './pages/Parents'
import Buses from './pages/Buses'
import BusProfile from './pages/BusProfile'
import Routes_ from './pages/Routes'
import Trips from './pages/Trips'
import Attendance from './pages/Attendance'
import Emergency from './pages/Emergency'
import Reports from './pages/Reports'
import Marketplace from './pages/Marketplace'
import SubscriptionManagement from './pages/SubscriptionManagement'
import Settings from './pages/Settings'
import FaceTest from './pages/FaceTest'

function App() {
    const { isAuthenticated, isLoading } = useAuth()

    // Dynamically load Google Maps script
    useEffect(() => {
        console.log('All env vars:', import.meta.env)
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        console.log('Google Maps API Key:', apiKey ? 'Loaded from .env' : 'NOT FOUND')
        console.log('Raw key value:', apiKey)

        // Temporary: use inline key if env not working
        const finalKey = apiKey || 'AIzaSyDilPB9G_6IJAwdD734gs2S6BJZF_PE1ec'

        if (finalKey && !document.querySelector('script[src*="maps.googleapis.com"]')) {
            const script = document.createElement('script')
            script.src = `https://maps.googleapis.com/maps/api/js?key=${finalKey}&libraries=places&loading=async`
            script.async = true
            script.defer = true
            document.head.appendChild(script)
            console.log('Google Maps script injected with key:', finalKey.substring(0, 10) + '...')
        }
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected routes */}
            <Route
                path="/"
                element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
            >
                <Route index element={<Dashboard />} />
                <Route path="schools" element={<Schools />} />
                <Route path="schools/:id" element={<SchoolDetail />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetail />} />
                <Route path="staff" element={<Staff />} />
                <Route path="parents" element={<Parents />} />
                <Route path="buses" element={<Buses />} />
                <Route path="buses/:id" element={<BusProfile />} />
                <Route path="routes" element={<Routes_ />} />
                <Route path="trips" element={<Trips />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="emergency" element={<Emergency />} />
                <Route path="reports" element={<Reports />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="subscriptions" element={<SubscriptionManagement />} />
                <Route path="settings" element={<Settings />} />
                <Route path="face-check" element={<FaceTest />} />
            </Route>

            {/* Catch all */}
            {/* Force Reload */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
