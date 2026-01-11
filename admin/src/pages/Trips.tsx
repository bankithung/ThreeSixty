import { useQuery } from '@tanstack/react-query'
import { tripsAPI } from '../lib/api'
import { FiActivity, FiMapPin, FiClock, FiUsers } from 'react-icons/fi'
import LiveMap from '../components/LiveMap'

export default function Trips() {
    const { data: activeTrips, isLoading: loadingActive } = useQuery({
        queryKey: ['activeTrips'],
        queryFn: () => tripsAPI.getActive(),
        refetchInterval: 15000, // Refresh every 15s
    })

    const { data: allTrips, isLoading: loadingAll } = useQuery({
        queryKey: ['trips'],
        queryFn: () => tripsAPI.list({ ordering: '-start_time' }),
    })

    const active = activeTrips?.data || []
    const trips = allTrips?.data?.results || allTrips?.data || []

    const statusColors: Record<string, string> = {
        scheduled: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-green-100 text-green-700',
        completed: 'bg-gray-100 text-gray-700',
        cancelled: 'bg-red-100 text-red-700',
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Live Map */}
            {active.length > 0 && <LiveMap trips={active} />}

            {/* Active Trips */}
            <div>
                <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                    <h2 className="text-lg font-semibold">Live Trips ({active.length})</h2>
                </div>

                {loadingActive ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : active.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {active.map((trip: any) => (
                            <div key={trip.id} className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-800">Bus {trip.bus_number}</h3>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        In Progress
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center text-gray-600">
                                        <FiMapPin className="w-4 h-4 mr-2" />
                                        {trip.route_name}
                                    </div>
                                    <div className="flex items-center text-gray-600">
                                        <FiUsers className="w-4 h-4 mr-2" />
                                        {trip.students_boarded} / {trip.total_students} students
                                    </div>
                                    <div className="flex items-center text-gray-600">
                                        <FiClock className="w-4 h-4 mr-2" />
                                        Started {new Date(trip.start_time).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all"
                                            style={{ width: `${trip.total_students > 0 ? (trip.students_dropped / trip.total_students) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {trip.students_dropped} dropped off
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                        <FiActivity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No active trips at the moment</p>
                    </div>
                )}
            </div>

            {/* All Trips Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Trip History</h2>
                </div>

                {loadingAll ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : trips.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {trips.map((trip: any) => (
                                    <tr key={trip.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(trip.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">{trip.bus_number}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{trip.route_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 capitalize">{trip.trip_type}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {trip.students_dropped}/{trip.total_students}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[trip.status] || ''}`}>
                                                {trip.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {trip.end_time && trip.start_time
                                                ? `${Math.round((new Date(trip.end_time).getTime() - new Date(trip.start_time).getTime()) / 60000)} min`
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">No trips found</div>
                )}
            </div>
        </div>
    )
}
