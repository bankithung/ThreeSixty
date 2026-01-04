import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { schoolsAPI } from '../lib/api'
import { FiUsers, FiTruck, FiMap, FiActivity } from 'react-icons/fi'

export default function SchoolDetail() {
    const { id } = useParams<{ id: string }>()

    const { data: schoolData, isLoading } = useQuery({
        queryKey: ['school', id],
        queryFn: () => schoolsAPI.get(id!),
        enabled: !!id,
    })

    const { data: statsData } = useQuery({
        queryKey: ['schoolStats', id],
        queryFn: () => schoolsAPI.getStats(id!),
        enabled: !!id,
    })

    const school = schoolData?.data
    const stats = statsData?.data

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            </div>
        )
    }

    if (!school) {
        return (
            <div className="text-center py-12 text-gray-500">
                School not found
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-2xl">{school.name?.[0]}</span>
                    </div>
                    <div className="ml-4">
                        <h1 className="text-2xl font-bold text-gray-800">{school.name}</h1>
                        <p className="text-gray-500">{school.code}</p>
                    </div>
                    <span
                        className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${school.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}
                    >
                        {school.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Students', value: stats?.total_students || 0, icon: FiUsers, color: 'blue' },
                    { label: 'Staff', value: stats?.total_staff || 0, icon: FiUsers, color: 'green' },
                    { label: 'Buses', value: stats?.total_buses || 0, icon: FiTruck, color: 'purple' },
                    { label: 'Routes', value: stats?.total_routes || 0, icon: FiMap, color: 'orange' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1 text-gray-900">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                                <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900">Contact Information</h2>
                    <dl className="space-y-3">
                        <div className="flex">
                            <dt className="w-24 text-gray-500">Phone</dt>
                            <dd className="font-medium text-gray-900">{school.phone || '-'}</dd>
                        </div>
                        <div className="flex">
                            <dt className="w-24 text-gray-500">Email</dt>
                            <dd className="font-medium text-gray-900">{school.email || '-'}</dd>
                        </div>
                        <div className="flex">
                            <dt className="w-24 text-gray-500">Address</dt>
                            <dd className="font-medium text-gray-900">{school.address || '-'}</dd>
                        </div>
                        <div className="flex">
                            <dt className="w-24 text-gray-500">City</dt>
                            <dd className="font-medium text-gray-900">{school.city}, {school.state}</dd>
                        </div>
                    </dl>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                            <FiUsers className="w-6 h-6 text-primary-500 mb-2" />
                            <p className="font-medium text-gray-900">Manage Students</p>
                        </button>
                        <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                            <FiTruck className="w-6 h-6 text-primary-500 mb-2" />
                            <p className="font-medium text-gray-900">Manage Buses</p>
                        </button>
                        <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                            <FiMap className="w-6 h-6 text-primary-500 mb-2" />
                            <p className="font-medium text-gray-900">Manage Routes</p>
                        </button>
                        <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
                            <FiActivity className="w-6 h-6 text-primary-500 mb-2" />
                            <p className="font-medium text-gray-900">View Reports</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
