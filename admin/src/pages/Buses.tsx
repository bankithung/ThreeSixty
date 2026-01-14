import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { busesAPI, schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiArrowLeft, FiEdit, FiTrash2, FiNavigation } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'
import BusStats from '../components/transport/BusStats'
import BusFilters from '../components/transport/BusFilters'
import BusCard from '../components/transport/BusCard'
import LiveBusTrackingModal from '../components/LiveBusTrackingModal'

export default function Buses() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const urlSchoolId = searchParams.get('school')
    const queryClient = useQueryClient()

    // State
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [selectedSchool, setSelectedSchool] = useState(urlSchoolId || '')
    const [trackingBus, setTrackingBus] = useState<{ id: string, number: string } | null>(null)

    // Data Fetching
    const { data: busesData, isLoading } = useQuery({
        queryKey: ['buses', search, selectedSchool], // search is applied on backend
        queryFn: () => busesAPI.list({ search, school_id: selectedSchool }),
    })

    const { data: schoolsData } = useQuery({
        queryKey: ['schools'],
        queryFn: () => schoolsAPI.list(),
        enabled: user?.role === 'root_admin',
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => busesAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buses'] })
            toast.success('Vehicle deleted successfully')
        },
    })

    // Processing & Filtering
    const allBuses = busesData?.data?.results || busesData?.data || []

    const filteredBuses = useMemo(() => {
        return allBuses.filter((bus: any) => {
            // Status Filter
            if (statusFilter === 'active' && !bus.is_active) return false
            if (statusFilter === 'inactive' && bus.is_active) return false

            return true
        })
    }, [allBuses, statusFilter])

    const schools = schoolsData?.data?.results || schoolsData?.data || []

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
            >
                <FiArrowLeft className="mr-2" /> Back
            </button>

            {/* Stats Overview */}
            <BusStats buses={allBuses} />

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    {/* Search */}
                    <div className="relative w-full max-w-md">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by bus number, registration..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all placeholder-gray-500"
                        />
                    </div>

                    {/* Filters */}
                    <BusFilters
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        schools={schools}
                        selectedSchool={selectedSchool}
                        setSelectedSchool={setSelectedSchool}
                    />
                </div>

                {/* Action */}
                <button
                    onClick={() => navigate('/buses/new')}
                    className="flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                    <FiPlus className="mr-2" />
                    Add Vehicle
                </button>
            </div>

            {/* Content Display */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filteredBuses.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredBuses.map((bus: any) => (
                                <BusCard
                                    key={bus.id}
                                    bus={bus}
                                    onDelete={(id) => deleteMutation.mutate(id)}
                                    onTrack={(b) => setTrackingBus({ id: b.id, number: b.number })}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                            <th className="px-6 py-4">Bus Number</th>
                                            <th className="px-6 py-4">Registration</th>
                                            <th className="px-6 py-4">Capacity</th>
                                            <th className="px-6 py-4">Fuel</th>
                                            <th className="px-6 py-4">Driver</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredBuses.map((bus: any) => (
                                            <tr
                                                key={bus.id}
                                                className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                                onClick={() => navigate(`/buses/${bus.id}`, { state: { schoolId: bus.school?.id || bus.school } })}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${bus.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        <span className="font-semibold text-gray-900">{bus.number}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-600">{bus.registration_number}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{bus.capacity} Seats</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 capitaliz">{bus.fuel_type || 'Diesel'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {bus.driver_name ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                                {bus.driver_name[0]}
                                                            </div>
                                                            {bus.driver_name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bus.is_active
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : 'bg-red-50 text-red-700 border-red-100'
                                                        }`}>
                                                        {bus.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setTrackingBus({ id: bus.id, number: bus.number })
                                                            }}
                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Track Live"
                                                        >
                                                            <FiNavigation className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                navigate(`/buses/${bus.id}`)
                                                            }}
                                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <FiEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (window.confirm('Delete this vehicle?')) deleteMutation.mutate(bus.id)
                                                            }}
                                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FiSearch className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No vehicles found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
                </div>
            )}

            {/* Live Tracking Modal */}
            <LiveBusTrackingModal
                isOpen={!!trackingBus}
                onClose={() => setTrackingBus(null)}
                busId={trackingBus?.id || ''}
                busNumber={trackingBus?.number || ''}
            />
        </div>
    )
}
