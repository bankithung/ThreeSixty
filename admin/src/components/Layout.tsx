import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLayout } from '../context/LayoutContext'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsAPI, accountsAPI } from '../lib/api'
import {
    MdDashboard, MdPeople, MdSchool, MdSubscriptions, MdDirectionsBus,
    MdRoute, MdTrackChanges, MdCheckCircle, MdWarning, MdBarChart,
    MdSettings, MdLogout, MdMenu, MdClose, MdStorefront, 
    MdChevronLeft, MdChevronRight, MdExpandMore, MdExpandLess,
    MdAccountBalance, MdAttachMoney, MdFamilyRestroom
} from 'react-icons/md'

const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: MdDashboard },
    { name: 'Subscriptions', href: '/subscriptions', icon: MdSubscriptions, adminOnly: true },
]

const mySchoolNavigation = [
    { name: 'Staff', href: '/staff', icon: MdPeople },
    { name: 'Students', href: '/students', icon: MdSchool },
    { name: 'Parents', href: '/parents', icon: MdFamilyRestroom },
]

const transportNavigation = [
    { name: 'Buses', href: '/buses', icon: MdDirectionsBus },
    { name: 'Routes', href: '/routes', icon: MdRoute },
    { name: 'Live Trips', href: '/trips', icon: MdTrackChanges },
]

const bottomNavigation = [
    { name: 'Attendance', href: '/attendance', icon: MdCheckCircle },
    { name: 'Emergency', href: '/emergency', icon: MdWarning },
    { name: 'Reports', href: '/reports', icon: MdBarChart },
    { name: 'Marketplace', href: '/marketplace', icon: MdStorefront },
    { name: 'Settings', href: '/settings', icon: MdSettings },
]

const rootNavigation = [
    { name: 'Dashboard', href: '/', icon: MdDashboard },
    { name: 'Schools', href: '/schools', icon: MdSchool },
    { name: 'Global Finance', href: '/finance', icon: MdAccountBalance },
    { name: 'Features & Pricing', href: '/features', icon: MdAttachMoney },
    { name: 'Settings', href: '/settings', icon: MdSettings },
]

export default function Layout() {
    const { user, logout } = useAuth()
    const { headerContent, sidebarCollapsed, toggleSidebar } = useLayout()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [transportOpen, setTransportOpen] = useState(true)
    const [mySchoolOpen, setMySchoolOpen] = useState(true)

    // Fetch active features for the school
    const { data: featuresData } = useQuery({
        queryKey: ['mySubscriptions'],
        queryFn: () => subscriptionsAPI.getMySubscriptions(),
        enabled: !!user && user.role !== 'root_admin',
    })

    const activeFeatures = featuresData?.data || []
    const hasBusTracking = (activeFeatures.includes('bus_tracking') || user?.role === 'root_admin') && user?.role !== 'root_admin'

    // Fetch user schools
    const { data: schoolsData } = useQuery({
        queryKey: ['mySchools'],
        queryFn: () => accountsAPI.getUserSchools(),
        enabled: !!user && user.role === 'school_admin',
    })

    const mySchoolId = schoolsData?.data?.results?.[0]?.school || schoolsData?.data?.[0]?.school
    const isRootAdmin = user?.role === 'root_admin'

    // Filter and transform navigation
    const navItems = isRootAdmin ? rootNavigation : baseNavigation.map(item => {
        if (item.name === 'Schools' && user?.role === 'school_admin') {
            return {
                ...item,
                name: 'My School',
                href: mySchoolId ? `/schools/${mySchoolId}` : '#',
                icon: MdSchool
            }
        }
        return item
    }).filter(item => {
        if (isRootAdmin) return true
        if (item.adminOnly && user?.role !== 'school_admin') return false
        return true
    })

    const navigationItems = isRootAdmin ? rootNavigation : navItems

    // Auto-collapse on mobile/tablet
    useEffect(() => {
        const handleResize = () => {
            // Auto-collapse on screens smaller than lg (1024px)
            if (window.innerWidth < 1024 && !sidebarCollapsed) {
                // Don't auto-collapse, let user control it
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [sidebarCollapsed])

    // Navigation item component
    const NavItem = ({ item, collapsed }: { item: any, collapsed: boolean }) => {
        const isActive = location.pathname === item.href
        const IconComponent = item.icon

        return (
            <Link
                to={item.href}
                className={`group relative flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center' : ''}`}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.name : ''}
            >
                <IconComponent className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0 transition-all duration-200 ${
                    isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'
                }`} />
                {!collapsed && (
                    <span className="ml-3 font-medium text-sm transition-opacity duration-200">
                        {item.name}
                    </span>
                )}
                {/* Tooltip for collapsed state */}
                {collapsed && (
                    <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {item.name}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                    </div>
                )}
            </Link>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out overflow-hidden ${
                    sidebarCollapsed ? 'w-20' : 'w-64'
                } ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0`}
            >
                {/* Logo Section */}
                <div className={`flex items-center h-16 px-4 border-b border-gray-200 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!sidebarCollapsed && (
                        <div className="flex items-center space-x-2">
                            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">D</span>
                            </div>
                            <span className="text-xl font-bold text-gray-800">
                                Doxaed
                            </span>
                        </div>
                    )}
                    {sidebarCollapsed && (
                        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">D</span>
                        </div>
                    )}
                    <button
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <MdClose className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden h-[calc(100vh-8rem)] custom-scrollbar">
                    {/* Main Navigation */}
                    <div className="space-y-1">
                        {navigationItems.map((item) => (
                            <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
                        ))}
                    </div>

                    {/* My School Section - For Non-Root Admins */}
                    {!isRootAdmin && (
                        <div className="pt-3 mt-3 border-t border-gray-200">
                            <button
                                onClick={() => setMySchoolOpen(!mySchoolOpen)}
                                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50`}
                                title={sidebarCollapsed ? 'My School' : ''}
                            >
                                {!sidebarCollapsed && <span>My School</span>}
                                {sidebarCollapsed ? (
                                    <MdSchool className="w-5 h-5" />
                                ) : (
                                    mySchoolOpen ? <MdExpandLess className="w-5 h-5" /> : <MdExpandMore className="w-5 h-5" />
                                )}
                            </button>

                            <div className={`mt-1 space-y-1 overflow-hidden transition-all duration-300 ${
                                mySchoolOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                            }`}>
                                <NavItem 
                                    item={{ 
                                        name: 'Profile', 
                                        href: mySchoolId ? `/schools/${mySchoolId}` : '#', 
                                        icon: MdSchool 
                                    }} 
                                    collapsed={sidebarCollapsed} 
                                />
                                {mySchoolNavigation.map((item) => (
                                    <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Transport Module - Only for School Admin with Bus Tracking */}
                    {!isRootAdmin && hasBusTracking && (
                        <div className="pt-3 mt-3 border-t border-gray-200">
                            <button
                                onClick={() => setTransportOpen(!transportOpen)}
                                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50`}
                                title={sidebarCollapsed ? 'Bus Tracking' : ''}
                            >
                                {!sidebarCollapsed && <span>Bus Tracking</span>}
                                {sidebarCollapsed ? (
                                    <MdDirectionsBus className="w-5 h-5" />
                                ) : (
                                    transportOpen ? <MdExpandLess className="w-5 h-5" /> : <MdExpandMore className="w-5 h-5" />
                                )}
                            </button>

                            <div className={`mt-1 space-y-1 overflow-hidden transition-all duration-300 ${
                                transportOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                            }`}>
                                {transportNavigation.map((item) => (
                                    <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bottom Navigation - Not for Root Admin */}
                    {!isRootAdmin && (
                        <div className="pt-3 mt-3 border-t border-gray-200 space-y-1">
                            {bottomNavigation.map((item) => (
                                <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
                            ))}
                        </div>
                    )}
                </nav>

                {/* User Section */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-white overflow-hidden">
                    <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!sidebarCollapsed ? (
                            <>
                                <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                                    <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary-700 font-semibold text-xs leading-none">
                                            {user?.first_name?.[0]}{user?.last_name?.[0]}
                                        </span>
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0 overflow-hidden">
                                        <p className="text-xs font-semibold text-gray-800 truncate">
                                            {user?.full_name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate capitalize">
                                            {user?.role?.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0"
                                    title="Logout"
                                >
                                    <MdLogout className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="relative group">
                                <button
                                    onClick={logout}
                                    className="w-9 h-9 bg-primary-100 rounded-full hover:bg-red-100 transition-all duration-200 flex items-center justify-center"
                                    title="Logout"
                                >
                                    <span className="text-primary-700 group-hover:text-red-600 font-semibold text-xs leading-none">
                                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                                    </span>
                                </button>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                    {user?.full_name}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Desktop Toggle Button - Outside sidebar to prevent clipping */}
            <button
                onClick={toggleSidebar}
                className={`hidden lg:flex fixed top-20 w-8 h-8 bg-white border-2 border-gray-400 rounded-full items-center justify-center hover:bg-gray-100 hover:border-gray-600 transition-all duration-200 z-50 ${
                    sidebarCollapsed ? 'left-[68px]' : 'left-[248px]'
                }`}
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {sidebarCollapsed ? (
                    <MdChevronRight className="w-5 h-5 text-gray-700" />
                ) : (
                    <MdChevronLeft className="w-5 h-5 text-gray-700" />
                )}
            </button>

            {/* Main content */}
            <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                {/* Top bar */}
                <header className={`sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200 ${location.pathname !== '/' ? 'lg:hidden' : ''}`}>
                    <div className="flex items-center min-h-[3.5rem] px-4 py-2">
                        <button
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <MdMenu className="w-6 h-6 text-gray-600" />
                        </button>
                        <div className="ml-4 lg:ml-0 flex-1">
                            {headerContent || (
                                <h1 className="text-xl font-bold text-gray-800">
                                    {[...baseNavigation, ...transportNavigation, ...bottomNavigation, ...rootNavigation]
                                        .find(n => n.href === location.pathname)?.name || 'Dashboard'}
                                </h1>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    )
}
