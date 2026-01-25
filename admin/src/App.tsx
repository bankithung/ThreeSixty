import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Schools from './pages/Schools'
import SchoolDetail from './pages/SchoolDetail'
import AddSchool from './pages/AddSchool'
import Students from './pages/Students'
import StudentDetail from './pages/StudentDetail'
import AddStudent from './pages/AddStudent'
import Staff from './pages/Staff'
import StaffDetail from './pages/StaffDetail'
import Parents from './pages/Parents'
import AddStaff from './pages/AddStaff'
import Teachers from './pages/Teachers'
import Buses from './pages/Buses'
import AddBus from './pages/AddBus'
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
import GlobalFinance from './pages/GlobalFinance'
import FeatureManagement from './pages/FeatureManagement'
import FeatureDetail from './pages/FeatureDetail'
import AddFeature from './pages/AddFeature'

function App() {
    const { isAuthenticated, isLoading } = useAuth()

    // Dynamically load Google Maps script - REMOVED (Handled by useJsApiLoader in components)
    // useEffect(() => {
    //     ...
    // }, [])

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
                <Route path="schools/new" element={<AddSchool />} />
                <Route path="schools/:id" element={<SchoolDetail />} />
                <Route path="students" element={<Students />} />
                <Route path="students/new" element={<AddStudent />} />
                <Route path="students/:id" element={<StudentDetail />} />
                <Route path="staff" element={<Staff />} />
                <Route path="staff/new" element={<AddStaff />} />
                <Route path="staff/:id" element={<StaffDetail />} />
                <Route path="staff/edit/:id" element={<AddStaff />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="parents" element={<Parents />} />
                <Route path="buses" element={<Buses />} />
                <Route path="buses/new" element={<AddBus />} />
                <Route path="buses/:id" element={<BusProfile />} />
                <Route path="routes" element={<Routes_ />} />
                <Route path="trips" element={<Trips />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="emergency" element={<Emergency />} />
                <Route path="reports" element={<Reports />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="subscriptions" element={<SubscriptionManagement />} />
                <Route path="settings" element={<Settings />} />
                <Route path="finance" element={<GlobalFinance />} />
                <Route path="features" element={<FeatureManagement />} />
                <Route path="features/new" element={<AddFeature />} />
                <Route path="features/:id" element={<FeatureDetail />} />
                <Route path="face-check" element={<FaceTest />} />
            </Route>

            {/* Catch all */}
            {/* Force Reload */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
