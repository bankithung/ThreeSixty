import { useQuery } from '@tanstack/react-query'
import { reportsAPI, tripsAPI } from '../lib/api'
import { FiUsers, FiTruck, FiMap, FiActivity, FiAlertTriangle } from 'react-icons/fi'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
)

interface StatCard {
    title: string
    value: number | string
    change?: string
    icon: React.ElementType
    color: string
}

export default function Dashboard() {
    // Fetch dashboard data
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => reportsAPI.getDashboard(),
    })

    const { data: activeTrips } = useQuery({
        queryKey: ['activeTrips'],
        queryFn: () => tripsAPI.getActive(),
        refetchInterval: 30000, // Refresh every 30s
    })

    const stats: StatCard[] = [
        {
            title: 'Total Students',
            value: dashboardData?.data?.total_students || 0,
            change: '+12%',
            icon: FiUsers,
            color: 'bg-blue-500',
        },
        {
            title: 'Active Buses',
            value: dashboardData?.data?.active_buses || 0,
            icon: FiTruck,
            color: 'bg-green-500',
        },
        {
            title: 'Routes',
            value: dashboardData?.data?.total_routes || 0,
            icon: FiMap,
            color: 'bg-purple-500',
        },
        {
            title: 'Live Trips',
            value: activeTrips?.data?.length || 0,
            icon: FiActivity,
            color: 'bg-orange-500',
        },
    ]

    // Chart data
    const attendanceChartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [
            {
                label: 'Present',
                data: [95, 92, 97, 89, 94, 45],
                backgroundColor: 'rgba(76, 175, 80, 0.8)',
                borderRadius: 8,
            },
            {
                label: 'Absent',
                data: [5, 8, 3, 11, 6, 5],
                backgroundColor: 'rgba(244, 67, 54, 0.8)',
                borderRadius: 8,
            },
        ],
    }

    const tripStatusData = {
        labels: ['Completed', 'In Progress', 'Scheduled'],
        datasets: [
            {
                data: [65, 8, 27],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(33, 150, 243, 0.8)',
                ],
                borderWidth: 0,
            },
        ],
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.title} className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.title}</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                                {stat.change && (
                                    <p className="text-sm text-green-500 mt-1">{stat.change} this month</p>
                                )}
                            </div>
                            <div className={`p-3 rounded-lg ${stat.color}`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Attendance</h3>
                    <Bar
                        data={attendanceChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: 100,
                                },
                            },
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                },
                            },
                        }}
                    />
                </div>

                {/* Trip Status */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Trip Status Today</h3>
                    <div className="flex items-center justify-center h-64">
                        <Doughnut
                            data={tripStatusData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                    },
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Active Trips Table */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Active Trips</h3>
                    <div className="flex items-center text-sm text-green-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                        Live
                    </div>
                </div>

                {activeTrips?.data?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-gray-500 border-b">
                                    <th className="pb-3 font-medium">Bus</th>
                                    <th className="pb-3 font-medium">Route</th>
                                    <th className="pb-3 font-medium">Type</th>
                                    <th className="pb-3 font-medium">Students</th>
                                    <th className="pb-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {activeTrips.data.map((trip: any) => (
                                    <tr key={trip.id} className="border-b last:border-0">
                                        <td className="py-3 font-medium">{trip.bus_number}</td>
                                        <td className="py-3">{trip.route_name}</td>
                                        <td className="py-3 capitalize">{trip.trip_type}</td>
                                        <td className="py-3">
                                            {trip.students_boarded} / {trip.total_students}
                                        </td>
                                        <td className="py-3">
                                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                                In Progress
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No active trips at the moment
                    </div>
                )}
            </div>

            {/* Emergency Alerts */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                    <FiAlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-800">Recent Alerts</h3>
                </div>
                <div className="text-center py-8 text-gray-500">
                    No active emergency alerts
                </div>
            </div>

            {/* Marketplace Recommendations */}
            <MarketplaceRecommendations />
        </div>
    )
}

// Internal component for Marketplace Recommendations to keep main component clean
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsAPI, accountsAPI } from '../lib/api'
import { FiShoppingBag, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

function MarketplaceRecommendations() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Only show to School Admins
    // if (user?.role === 'root_admin') return null

    const { data: featuresData } = useQuery({
        queryKey: ['features'],
        queryFn: () => subscriptionsAPI.listFeatures(),
    })

    const { data: mySubscriptionsData } = useQuery({
        queryKey: ['mySubscriptionsDetails'],
        queryFn: () => subscriptionsAPI.listSubscriptions(),
    })

    const { data: userSchoolsData } = useQuery({
        queryKey: ['userSchools'],
        queryFn: () => accountsAPI.getUserSchools(),
        enabled: !!user,
    })

    const features = featuresData?.data?.results || featuresData?.data || []
    const subscriptions = mySubscriptionsData?.data?.results || mySubscriptionsData?.data || []
    const userSchools = userSchoolsData?.data?.results || userSchoolsData?.data || []

    // Debug logging
    console.log('Dashboard Debug:', {
        role: user?.role,
        featuresLength: features.length,
        userSchoolsLength: userSchools.length,
        hasSubs: subscriptions.length > 0
    })

    // Backend serializer returns 'school' as key with the ID string value.
    const currentSchoolId = userSchools[0]?.school

    // Filter features that are NOT active
    const activeFeatureIds = new Set(subscriptions.filter((s: any) => s.is_active).map((s: any) => s.feature))
    const recommendedFeatures = features.filter((f: any) => !activeFeatureIds.has(f.id)).slice(0, 3)

    const subscribeMutation = useMutation({
        mutationFn: (featureId: string) => subscriptionsAPI.createSubscription({
            school_id: currentSchoolId,
            feature_id: featureId
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mySubscriptions'] })
            queryClient.invalidateQueries({ queryKey: ['mySubscriptionsDetails'] })
            toast.success('Feature activated successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to activate feature')
        }
    })

    if (recommendedFeatures.length === 0) return null

    return (
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold flex items-center">
                        <FiShoppingBag className="mr-2" />
                        Unlock More Power for Your School
                    </h3>
                    <p className="text-primary-100 mt-1">Enhance your management system with these premium features.</p>
                </div>
                <Link to="/marketplace" className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                    View All Features
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendedFeatures.map((feature: any) => (
                    <div key={feature.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                        <h4 className="font-bold text-lg mb-1">{feature.name}</h4>
                        <p className="text-primary-100 text-sm mb-4 h-10 overflow-hidden">{feature.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                            <span className="font-bold text-xl">${feature.price}</span>
                            <button
                                onClick={() => currentSchoolId && subscribeMutation.mutate(feature.id)}
                                disabled={subscribeMutation.isPending || !currentSchoolId}
                                className="bg-white text-primary-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                {subscribeMutation.isPending ? 'Activating...' : 'Activate Now'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
