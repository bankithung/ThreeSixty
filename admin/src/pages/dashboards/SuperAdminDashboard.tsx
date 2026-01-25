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
import { Bar, Line } from 'react-chartjs-2'
import { FiUsers, FiTruck, FiDollarSign, FiLayers } from 'react-icons/fi'
import { Link } from 'react-router-dom'

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

export default function SuperAdminDashboard({ stats }: { stats: any }) {

    // Process Growth Chart Data
    const schoolGrowthLabels = stats.charts?.school_growth?.map((d: any) => new Date(d.month).toLocaleDateString('en-US', { month: 'short' })) || []
    const schoolGrowthData = stats.charts?.school_growth?.map((d: any) => d.count) || []

    const revenueGrowthLabels = stats.charts?.revenue_growth?.map((d: any) => new Date(d.month).toLocaleDateString('en-US', { month: 'short' })) || []
    const revenueGrowthData = stats.charts?.revenue_growth?.map((d: any) => d.total) || []

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* MRR Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Monthly Revenue (MRR)</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">₹{stats.total_revenue?.toLocaleString() || 0}</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-lg">
                            <FiDollarSign className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </div>

                {/* Schools Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Schools</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats.total_schools || 0}</h3>
                            <div className="flex items-center mt-1 text-xs">
                                <span className="text-green-600 font-medium mr-2">{stats.active_schools} Active</span>
                                <span className="text-red-500 font-medium">{stats.blocked_schools} Blocked</span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <FiTruck className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Users Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Users</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                {(stats.total_students + stats.total_staff)?.toLocaleString() || 0}
                            </h3>
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                                <span className="mr-2">{stats.total_students} Students</span>
                                <span className="mr-2">{stats.total_staff} Staff</span>
                            </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <FiUsers className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* Active Subs Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats.active_subscriptions || 0}</h3>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                            <FiLayers className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Growth Line Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Growth</h3>
                    <div className="h-64">
                        <Line
                            data={{
                                labels: revenueGrowthLabels,
                                datasets: [{
                                    label: 'Revenue (₹)',
                                    data: revenueGrowthData,
                                    borderColor: 'rgb(79, 70, 229)',
                                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true } }
                            }}
                        />
                    </div>
                </div>

                {/* School Acquisitions Bar Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">New Schools</h3>
                    <div className="h-64">
                        <Bar
                            data={{
                                labels: schoolGrowthLabels,
                                datasets: [{
                                    label: 'New Schools',
                                    data: schoolGrowthData,
                                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                    borderRadius: 4,
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                                    x: { grid: { display: false } }
                                },
                                maxBarThickness: 50,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Recent Registrations</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">School Name</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Registered On</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recent_activity?.length > 0 ? (
                                stats.recent_activity.map((school: any) => (
                                    <tr key={school.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {school.logo ? (
                                                    <img
                                                        src={school.logo}
                                                        alt={school.name}
                                                        className="w-8 h-8 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                        {school.name?.[0]}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-gray-800">{school.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{school.city}</td>
                                        <td className="px-6 py-4">{new Date(school.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${school.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link to={`/schools/${school.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                        No recent activity found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
