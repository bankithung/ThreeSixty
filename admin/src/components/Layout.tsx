import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsAPI } from '../lib/api'
import {
    FiHome, FiUsers, FiTruck, FiMap, FiActivity,
    FiAlertTriangle, FiBarChart2, FiSettings, FiLogOut,
    FiMenu, FiX, FiBook, FiBell, FiShoppingBag, FiChevronDown, FiChevronRight
} from 'react-icons/fi'

const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Schools', href: '/schools', icon: FiBook, adminOnly: true },
    { name: 'Subscriptions', href: '/subscriptions', icon: FiActivity, adminOnly: true }, // Root Admin only
    { name: 'Students', href: '/students', icon: FiUsers },
    { name: 'Staff', href: '/staff', icon: FiUsers },
    { name: 'Parents', href: '/parents', icon: FiUsers },
]

const transportNavigation = [
    { name: 'Buses', href: '/buses', icon: FiTruck },
    { name: 'Routes', href: '/routes', icon: FiMap },
    { name: 'Live Trips', href: '/trips', icon: FiActivity },
]

const bottomNavigation = [
    { name: 'Attendance', href: '/attendance', icon: FiBell },
    { name: 'Emergency', href: '/emergency', icon: FiAlertTriangle },
    { name: 'Reports', href: '/reports', icon: FiBarChart2 },
    { name: 'Marketplace', href: '/marketplace', icon: FiShoppingBag }, // New Marketplace link
    { name: 'Settings', href: '/settings', icon: FiSettings },
]

const rootNavigation = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Schools', href: '/schools', icon: FiBook },
    { name: 'Global Finance', href: '/finance', icon: FiActivity },
    { name: 'Features & Pricing', href: '/features', icon: FiSettings },
    { name: 'Settings', href: '/settings', icon: FiSettings },
]

export default function Layout() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [transportOpen, setTransportOpen] = useState(true)

    // Fetch active features for the school (or all if root admin)
    const { data: featuresData } = useQuery({
        queryKey: ['mySubscriptions'],
        queryFn: () => subscriptionsAPI.getMySubscriptions(),
        enabled: !!user && user.role !== 'root_admin', // Don't fetch this for root admin or handle differently
    })

    const activeFeatures = featuresData?.data || []
    const hasBusTracking = (activeFeatures.includes('bus_tracking') || user?.role === 'root_admin') && user?.role !== 'root_admin' // Only show bus tracking in sidebar for School Admin, Root Admin accesses via School Detail

    // Filter base navigation
    const filteredBaseNav = baseNavigation.filter(item =>
        !item.adminOnly || user?.role === 'school_admin'
    )

    const isRootAdmin = user?.role === 'root_admin'
    const navigationItems = isRootAdmin ? rootNavigation : filteredBaseNav

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-30 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center h-16 px-6 border-b">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">D</span>
                        </div>
                        <span className="ml-2 text-lg font-semibold text-gray-800">Doxaed</span>
                    </div>
                    <button
                        className="ml-auto lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
                    {navigationItems.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-500' : ''}`} />
                                <span className="ml-3 font-medium">{item.name}</span>
                            </Link>
                        )
                    })}

                    {/* Transport Module Group - Only for School Admin */}
                    {!isRootAdmin && hasBusTracking && (
                        <div className="pt-2">
                            <button
                                onClick={() => setTransportOpen(!transportOpen)}
                                className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                            >
                                <span>Bus Tracking</span>
                                {transportOpen ? <FiChevronDown /> : <FiChevronRight />}
                            </button>

                            {transportOpen && (
                                <div className="mt-1 space-y-1">
                                    {transportNavigation.map((item) => {
                                        const isActive = location.pathname === item.href
                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.href}
                                                className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ml-2 ${isActive
                                                    ? 'bg-primary-50 text-primary-600'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-500' : ''}`} />
                                                <span className="ml-3 font-medium">{item.name}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {!isRootAdmin && (
                        <div className="pt-2 border-t mt-2">
                            {bottomNavigation.map((item) => {
                                const isActive = location.pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ${isActive
                                            ? 'bg-primary-50 text-primary-600'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-500' : ''}`} />
                                        <span className="ml-3 font-medium">{item.name}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </nav>

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                                {user?.first_name?.[0]}{user?.last_name?.[0]}
                            </span>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                                {user?.full_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate capitalize">
                                {user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            title="Logout"
                        >
                            <FiLogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header className="sticky top-0 z-10 bg-white shadow-sm">
                    <div className="flex items-center h-16 px-4 lg:px-8">
                        <button
                            className="lg:hidden p-2"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <FiMenu className="w-6 h-6" />
                        </button>
                        <h1 className="ml-4 lg:ml-0 text-xl font-semibold text-gray-800">
                            {/* Dynamic Header Logic */}
                            {[...baseNavigation, ...transportNavigation, ...bottomNavigation, ...rootNavigation].find(n => n.href === location.pathname)?.name || 'Dashboard'}
                        </h1>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
