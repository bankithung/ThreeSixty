import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { reportsAPI } from '../lib/api'
import SuperAdminDashboard from './dashboards/SuperAdminDashboard'
import SchoolAdminDashboard from './dashboards/SchoolAdminDashboard'

export default function Dashboard() {
    const { user } = useAuth()
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => reportsAPI.getDashboard(),
        refetchInterval: 15000, 
    })

    const stats = dashboardData?.data || {}
    const isRootAdmin = user?.role === 'root_admin'

    // Show loading state differently based on role expectation if possible, or generic
    if (isLoading && !stats.total_schools && !stats.school_name) {
         return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-8 bg-primary-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <p className="text-xs text-gray-400 mt-2">Loading Dashboard...</p>
                </div>
            </div>
        )
    }

    if (isRootAdmin) {
        return <SuperAdminDashboard stats={stats} />
    }

    return <SchoolAdminDashboard stats={stats} />
}
