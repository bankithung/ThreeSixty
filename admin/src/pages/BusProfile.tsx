import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { busesAPI, routesAPI } from '../lib/api'
import { useBusSocket } from '../hooks/useBusSocket'
import StopMapEditor from '../components/StopMapEditor'
import ManageStopStudentsModal from '../components/ManageStopStudentsModal'
import toast from 'react-hot-toast'
import {
    FiArrowLeft, FiEdit, FiTruck, FiMapPin, FiUsers, FiDollarSign,
    FiActivity, FiBarChart2, FiDroplet, FiClock,
    FiPlus, FiTrash2, FiNavigation, FiX, FiUpload, FiEdit2
} from 'react-icons/fi'

// Tab types
type TabType = 'overview' | 'routes' | 'telemetry' | 'fuel' | 'expenses' | 'earnings' | 'students' | 'analytics'

// Tab configuration
const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FiTruck /> },
    { id: 'routes', label: 'Routes & Stops', icon: <FiMapPin /> },
    { id: 'telemetry', label: 'Telemetry', icon: <FiActivity /> },
    { id: 'fuel', label: 'Fuel', icon: <FiDroplet /> },
    { id: 'expenses', label: 'Expenses', icon: <FiDollarSign /> },
    { id: 'earnings', label: 'Earnings', icon: <FiDollarSign /> },
    { id: 'students', label: 'Students', icon: <FiUsers /> },
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart2 /> },
]

export default function BusProfile() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabType>('overview')

    // Fetch bus profile
    const { data: busData, isLoading, error } = useQuery({
        queryKey: ['busProfile', id],
        queryFn: () => busesAPI.getProfile(id!),
        enabled: !!id,
    })

    // Live tracking via WebSocket
    const { liveStatus } = useBusSocket(id)

    const bus = busData?.data

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            </div>
        )
    }

    if (error || !bus) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">Failed to load bus profile</p>
                <button onClick={() => navigate('/buses')} className="mt-4 text-primary-500 hover:underline">
                    ← Back to Buses
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/buses')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bus {bus.number}</h1>
                        <p className="text-gray-500">{bus.registration_number}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {liveStatus?.has_active_trip && (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium animate-pulse">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            Trip Active
                        </span>
                    )}
                    <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${bus.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {bus.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Bus Header Card with Image Gallery */}
            <BusHeaderCard bus={bus} liveStatus={liveStatus} />

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1 overflow-x-auto pb-px">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                {activeTab === 'overview' && <OverviewTab bus={bus} liveStatus={liveStatus} />}
                {activeTab === 'routes' && <RoutesTab busId={id!} />}
                {activeTab === 'telemetry' && <TelemetryTab bus={bus} />}
                {activeTab === 'fuel' && <FuelTab busId={id!} />}
                {activeTab === 'expenses' && <ExpensesTab busId={id!} />}
                {activeTab === 'earnings' && <EarningsTab busId={id!} />}
                {activeTab === 'students' && <StudentsTab busId={id!} />}
                {activeTab === 'analytics' && <AnalyticsTab busId={id!} />}
            </div>
        </div>
    )
}

// ============ BUS HEADER CARD ============
function BusHeaderCard({ bus, liveStatus }: { bus: any; liveStatus: any }) {
    const [images, setImages] = useState<string[]>(bus.images || [])
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('image', file)

        setUploading(true)
        try {
            const response = await busesAPI.uploadImage(bus.id, formData)
            setImages(response.data.images)
            toast.success('Image uploaded successfully')
        } catch (error) {
            toast.error('Failed to upload image')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDeleteImage = async (index: number) => {
        try {
            const response = await busesAPI.deleteImage(bus.id, index)
            setImages(response.data.images)
            toast.success('Image deleted')
        } catch (error) {
            toast.error('Failed to delete image')
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row">
                {/* Image Gallery */}
                <div className="w-full md:w-80 h-48 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    {bus.images && bus.images.length > 0 ? (
                        <img
                            src={bus.images[0]}
                            alt={`Bus ${bus.number}`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <FiTruck className="w-20 h-20 text-white/80" />
                    )}
                </div>

                {/* Bus Info */}
                <div className="flex-1 p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <InfoItem label="School" value={bus.school_name} />
                        <InfoItem label="Capacity" value={`${bus.capacity} seats`} />
                        <InfoItem label="Driver" value={bus.driver_name || '-'} />
                        <InfoItem label="Conductor" value={bus.conductor_name || '-'} />
                        <InfoItem label="Make & Model" value={`${bus.make || '-'} ${bus.model || ''}`} />
                        <InfoItem label="Year" value={bus.year || '-'} />
                        <InfoItem label="Fuel Type" value={bus.fuel_type?.toUpperCase() || 'DIESEL'} />
                        <InfoItem label="Age" value={bus.age_years ? `${bus.age_years} years` : '-'} />
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatBadge
                            icon={<FiMapPin />}
                            label="Distance"
                            value={`${bus.total_distance_km || 0} km`}
                            color="blue"
                        />
                        <StatBadge
                            icon={<FiClock />}
                            label="Duration"
                            value={`${bus.total_duration_hours || 0} hrs`}
                            color="purple"
                        />
                        <StatBadge
                            icon={<FiActivity />}
                            label="Trips"
                            value={bus.total_trips || 0}
                            color="green"
                        />
                        <StatBadge
                            icon={<FiUsers />}
                            label="Students"
                            value={bus.total_students || 0}
                            color="orange"
                        />
                        <StatBadge
                            icon={<FiDroplet />}
                            label="Fuel Used"
                            value={`${bus.total_fuel_liters || 0} L`}
                            color="red"
                        />
                    </div>
                </div>
            </div>

            {/* Image Gallery Section */}
            <div className="px-6 py-4 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Bus Images</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative flex-shrink-0 group w-32 h-32 overflow-hidden rounded-lg">
                            <img
                                src={img}
                                alt={`Bus ${idx + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => handleDeleteImage(idx)}
                                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <FiX size={14} />
                            </button>
                        </div>
                    ))}

                    <label className="flex-shrink-0 w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-50">
                        {uploading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                        ) : (
                            <>
                                <FiUpload className="text-gray-400 mb-1" size={24} />
                                <span className="text-xs text-gray-500">Upload</span>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {/* Live Trip Panel */}
            {liveStatus?.has_active_trip && (
                <div className="px-6 py-4 bg-green-50 border-t border-green-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2 text-green-700 font-medium">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Live Trip: {liveStatus.trip?.route_name || 'Unknown Route'}
                            </span>
                            <span className="text-sm text-green-600">
                                {liveStatus.trip?.students_boarded || 0} boarded |
                                {liveStatus.trip?.students_dropped || 0} dropped |
                                {(liveStatus.trip?.total_students || 0) - (liveStatus.trip?.students_boarded || 0)} remaining
                            </span>
                        </div>
                        {liveStatus.location && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <FiNavigation className="w-4 h-4" />
                                {liveStatus.location.speed || 0} km/h
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ============ HELPER COMPONENTS ============
function InfoItem({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
        </div>
    )
}

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
        green: 'bg-green-100 text-green-700',
        orange: 'bg-orange-100 text-orange-700',
        red: 'bg-red-100 text-red-700',
    }
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors[color]}`}>
            {icon}
            <div>
                <p className="text-xs opacity-80">{label}</p>
                <p className="font-semibold">{value}</p>
            </div>
        </div>
    )
}

// ============ TAB COMPONENTS ============

// Overview Tab
function OverviewTab({ bus, liveStatus }: { bus: any; liveStatus: any }) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 rounded-xl p-5">
                    <p className="text-sm text-green-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-700">₹{(bus.total_earnings || 0).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-5">
                    <p className="text-sm text-red-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-700">₹{(bus.total_expenses || 0).toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-5">
                    <p className="text-sm text-blue-600">Net Profit/Loss</p>
                    <p className={`text-2xl font-bold ${(bus.total_earnings || 0) - (bus.total_expenses || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                        ₹{((bus.total_earnings || 0) - (bus.total_expenses || 0)).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Live Students Panel */}
            {liveStatus?.has_active_trip && liveStatus.students && liveStatus.students.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Students Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {liveStatus.students.map((student: any) => (
                            <div
                                key={student.id}
                                className={`flex items-center gap-2 p-3 rounded-lg border ${student.status === 'dropped' ? 'bg-gray-50 border-gray-200' :
                                    student.status === 'boarded' ? 'bg-green-50 border-green-200' :
                                        'bg-yellow-50 border-yellow-200'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${student.status === 'dropped' ? 'bg-gray-400' :
                                    student.status === 'boarded' ? 'bg-green-500' :
                                        'bg-yellow-500'
                                    }`}>
                                    {student.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">{student.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {student.status === 'dropped' ? '✓ Dropped' :
                                            student.status === 'boarded' ? '✓ On Bus' : '⏳ Waiting'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Routes Overview */}
            {bus.routes && bus.routes.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Routes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bus.routes.map((route: any) => (
                            <div key={route.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{route.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {route.stops_count} stops • {route.student_count} students
                                    </p>
                                </div>
                                <FiMapPin className="text-gray-400" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Routes Tab
function RoutesTab({ busId }: { busId: string }) {
    const queryClient = useQueryClient()
    const [editingRoute, setEditingRoute] = useState<any>(null)
    const [managingStop, setManagingStop] = useState<{ routeId: string, stop: any } | null>(null)

    const { data: routesData, isLoading } = useQuery({
        queryKey: ['routes', { bus_id: busId }],
        queryFn: () => routesAPI.list({ bus_id: busId, include_stops: 'true' }),
    })

    // Fetch route stops when editing
    const { data: routeStopsData } = useQuery({
        queryKey: ['routeStops', editingRoute?.id],
        queryFn: async () => {
            console.log('🔍 Fetching stops for route:', editingRoute?.id)
            const response = await routesAPI.getStops(editingRoute!.id)
            console.log('📥 Stops fetched:', response)
            return response
        },
        enabled: !!editingRoute?.id,
    })

    const updateStopsMutation = useMutation({
        mutationFn: ({ routeId, stops }: { routeId: string; stops: any[] }) => {
            console.log('🚀 Sending stops to backend:', { routeId, stopsCount: stops.length, stops })
            return routesAPI.replaceStops(routeId, stops)
        },
        onSuccess: (response, variables) => {
            console.log('✅ Save successful!', response)
            queryClient.invalidateQueries({ queryKey: ['routes'] })
            queryClient.invalidateQueries({ queryKey: ['routeStops', variables.routeId] })
            queryClient.invalidateQueries({ queryKey: ['busProfile', busId] })
            toast.success('Stops updated successfully')
            setEditingRoute(null)
        },
        onError: (error: any) => {
            console.error('❌ Save failed:', error)
            console.error('Error response:', error.response?.data)
            toast.error(error.response?.data?.error || 'Failed to update stops')
        }
    })

    const routes = routesData?.data?.results || routesData?.data || []
    const routeStops = Array.isArray(routeStopsData?.data)
        ? routeStopsData.data
        : (routeStopsData?.data?.results || [])

    if (isLoading) return <div className="text-center py-8">Loading routes...</div>

    if (editingRoute) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Editing Route: {editingRoute.name}
                    </h3>
                    <button
                        onClick={() => setEditingRoute(null)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                <StopMapEditor
                    stops={routeStops}
                    onSave={(stops) => updateStopsMutation.mutate({ routeId: editingRoute.id, stops })}
                    isSaving={updateStopsMutation.isPending}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Routes & Stops</h3>
            </div>

            {routes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No routes assigned to this bus</p>
            ) : (
                <div className="space-y-4">
                    {routes.map((route: any) => (
                        <div key={route.id} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-gray-50">
                                <div>
                                    <h4 className="font-medium text-gray-900">{route.name}</h4>
                                    <p className="text-sm text-gray-500">{route.description || 'No description'}</p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="text-right">
                                        <p className="text-gray-600">{route.distance_km || '-'} km</p>
                                        <p className="text-gray-400">{route.estimated_duration} min</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingRoute(route)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                    >
                                        <FiEdit /> Edit Stops
                                    </button>
                                </div>
                            </div>
                            {route.stops && route.stops.length > 0 ? (
                                <div className="p-4">
                                    <div className="space-y-2">
                                        {route.stops.map((stop: any, idx: number) => (
                                            <div key={stop.id} className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800">{stop.name}</p>
                                                    <p className="text-xs text-gray-500">{stop.address || 'No address'}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-400">{stop.student_count} students</span>
                                                    <button
                                                        onClick={() => setManagingStop({ routeId: route.id, stop })}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Manage Students"
                                                    >
                                                        <FiUsers className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-500 bg-gray-50/50">
                                    No stops added yet. Click "Edit Stops" to add some.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Stop Students Modal */}
            {managingStop && (
                <ManageStopStudentsModal
                    busId={busId}
                    routeId={managingStop.routeId}
                    stop={managingStop.stop}
                    onClose={() => setManagingStop(null)}
                />
            )}
        </div>
    )
}

// Telemetry Tab
function TelemetryTab({ bus }: { bus: any }) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Telemetry Data</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-5 text-center">
                    <FiMapPin className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-3xl font-bold text-blue-700">{bus.total_distance_km || 0}</p>
                    <p className="text-sm text-blue-600">Total KM</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 text-center">
                    <FiClock className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <p className="text-3xl font-bold text-purple-700">{bus.total_duration_hours || 0}</p>
                    <p className="text-sm text-purple-600">Total Hours</p>
                </div>
                <div className="bg-green-50 rounded-xl p-5 text-center">
                    <FiActivity className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-3xl font-bold text-green-700">{bus.total_trips || 0}</p>
                    <p className="text-sm text-green-600">Total Trips</p>
                </div>
                <div className="bg-red-50 rounded-xl p-5 text-center">
                    <FiDroplet className="w-8 h-8 mx-auto text-red-500 mb-2" />
                    <p className="text-3xl font-bold text-red-700">{bus.total_fuel_liters || 0}</p>
                    <p className="text-sm text-red-600">Liters Used</p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-center text-gray-500">
                    Detailed telemetry charts and trip history will appear here.
                    <br />
                    <span className="text-sm">Data is auto-calculated from GPS tracking and trip records.</span>
                </p>
            </div>
        </div>
    )
}

// ============ FUEL TAB ============
function FuelTab({ busId }: { busId: string }) {
    const queryClient = useQueryClient()
    const [showAddForm, setShowAddForm] = useState(false)
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        liters: '',
        cost: '',
        odometer_reading: '',
        notes: ''
    })

    const { data: fuelData } = useQuery({
        queryKey: ['busFuel', busId],
        queryFn: () => busesAPI.listFuel(busId)
    })

    const fuel = Array.isArray(fuelData) ? fuelData : (fuelData?.data || [])

    const addMutation = useMutation({
        mutationFn: (data: any) => busesAPI.addFuel(busId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busFuel', busId] })
            queryClient.invalidateQueries({ queryKey: ['busProfile', busId] })
            toast.success('Fuel entry added')
            setShowAddForm(false)
            setFormData({ date: new Date().toISOString().split('T')[0], liters: '', cost: '', odometer_reading: '', notes: '' })
        },
        onError: () => toast.error('Failed to add fuel entry')
    })

    const deleteMutation = useMutation({
        mutationFn: (fuelId: string) => busesAPI.deleteFuel(busId, fuelId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busFuel', busId] })
            queryClient.invalidateQueries({ queryKey: ['busProfile', busId] })
            toast.success('Fuel entry deleted')
        },
        onError: () => toast.error('Failed to delete fuel entry')
    })

    const totalLiters = Array.isArray(fuel) ? fuel.reduce((sum: number, f: any) => sum + parseFloat(f.liters || 0), 0) : 0
    const totalCost = Array.isArray(fuel) ? fuel.reduce((sum: number, f: any) => sum + parseFloat(f.cost || 0), 0) : 0

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border">
                    <div className="text-sm text-gray-500">Total Fuel</div>
                    <div className="text-2xl font-bold text-gray-900">{totalLiters.toFixed(1)} L</div>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                    <div className="text-sm text-gray-500">Total Cost</div>
                    <div className="text-2xl font-bold text-gray-900">₹{totalCost.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                    <div className="text-sm text-gray-500">Entries</div>
                    <div className="text-2xl font-bold text-gray-900">{fuel.length}</div>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Fuel Entries</h3>
                <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2">
                    <FiPlus /> Add Entry
                </button>
            </div>

            {showAddForm && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="px-3 py-2 border rounded-lg" />
                        <input type="number" placeholder="Liters" value={formData.liters} onChange={(e) => setFormData({ ...formData, liters: e.target.value })} className="px-3 py-2 border rounded-lg" />
                        <input type="number" placeholder="Cost (₹)" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="px-3 py-2 border rounded-lg" />
                        <input type="number" placeholder="Odometer (km)" value={formData.odometer_reading} onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })} className="px-3 py-2 border rounded-lg" />
                    </div>
                    <textarea placeholder="Notes (optional)" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg mb-4" rows={2} />
                    <button onClick={() => addMutation.mutate(formData)} className="px-4 py-2 bg-green-500 text-white rounded-lg">Save Entry</button>
                </div>
            )}

            <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">Date</th>
                            <th className="text-left p-3 text-sm font-medium">Liters</th>
                            <th className="text-left p-3 text-sm font-medium">Cost</th>
                            <th className="text-left p-3 text-sm font-medium">Odometer</th>
                            <th className="text-left p-3 text-sm font-medium">Notes</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(fuel) && fuel.map((entry: any) => (
                            <tr key={entry.id} className="border-b last:border-0">
                                <td className="p-3 text-sm">{entry.date}</td>
                                <td className="p-3 text-sm">{entry.liters} L</td>
                                <td className="p-3 text-sm">₹{entry.cost}</td>
                                <td className="p-3 text-sm">{entry.odometer_reading || '-'} km</td>
                                <td className="p-3 text-sm text-gray-500">{entry.notes || '-'}</td>
                                <td className="p-3">
                                    <button onClick={() => deleteMutation.mutate(entry.id)} className="text-red-500 hover:text-red-700">
                                        <FiTrash2 />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Expenses Tab
function ExpensesTab({ busId }: { busId: string }) {
    const queryClient = useQueryClient()
    const [showAddForm, setShowAddForm] = useState(false)
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'maintenance',
        amount: '',
        description: '',
    })

    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['busExpenses', busId],
        queryFn: () => busesAPI.listExpenses(busId),
    })

    const addMutation = useMutation({
        mutationFn: (data: any) => busesAPI.addExpense(busId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busExpenses', busId] })
            queryClient.invalidateQueries({ queryKey: ['busProfile', busId] })
            toast.success('Expense added')
            setShowAddForm(false)
            setFormData({ date: new Date().toISOString().split('T')[0], category: 'maintenance', amount: '', description: '' })
        },
        onError: () => toast.error('Failed to add expense'),
    })

    const deleteMutation = useMutation({
        mutationFn: (expenseId: string) => busesAPI.deleteExpense(busId, expenseId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busExpenses', busId] })
            queryClient.invalidateQueries({ queryKey: ['busProfile', busId] })
            toast.success('Expense deleted')
        },
    })

    const expenses = expensesData?.data || []
    const categories = [
        { value: 'fuel', label: 'Fuel' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'repair', label: 'Repair' },
        { value: 'tax', label: 'Tax/Registration' },
        { value: 'cleaning', label: 'Cleaning' },
        { value: 'salary', label: 'Staff Salary' },
        { value: 'parking', label: 'Parking/Toll' },
        { value: 'other', label: 'Other' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <FiPlus /> Add Expense
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            >
                                {categories.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="Details..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">
                            Cancel
                        </button>
                        <button
                            onClick={() => addMutation.mutate(formData)}
                            disabled={addMutation.isPending || !formData.amount || !formData.description}
                            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                            {addMutation.isPending ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                </div>
            )}

            {/* Expenses Table */}
            {isLoading ? (
                <div className="text-center py-8">Loading expenses...</div>
            ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No expenses recorded yet</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-500 border-b">
                                <th className="pb-3">Date</th>
                                <th className="pb-3">Category</th>
                                <th className="pb-3">Description</th>
                                <th className="pb-3 text-right">Amount</th>
                                <th className="pb-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(expenses) && expenses.map((expense: any) => (
                                <tr key={expense.id} className="border-b last:border-0">
                                    <td className="py-3 text-sm">{expense.date}</td>
                                    <td className="py-3">
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                                            {expense.category_display}
                                        </span>
                                    </td>
                                    <td className="py-3 text-sm text-gray-600">{expense.description}</td>
                                    <td className="py-3 text-right font-medium text-red-600">₹{parseFloat(expense.amount).toLocaleString()}</td>
                                    <td className="py-3 text-right">
                                        <button
                                            onClick={() => deleteMutation.mutate(expense.id)}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// Earnings Tab
function EarningsTab({ busId }: { busId: string }) {
    const queryClient = useQueryClient()
    const [showAddForm, setShowAddForm] = useState(false)
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        earning_type: 'monthly',
        amount: '',
        description: '',
    })

    const { data: earningsData, isLoading } = useQuery({
        queryKey: ['busEarnings', busId],
        queryFn: () => busesAPI.listEarnings(busId),
    })

    const addMutation = useMutation({
        mutationFn: (data: any) => busesAPI.addEarning(busId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busEarnings', busId] })
            queryClient.invalidateQueries({ queryKey: ['busProfile', busId] })
            toast.success('Earning added')
            setShowAddForm(false)
            setFormData({ date: new Date().toISOString().split('T')[0], earning_type: 'monthly', amount: '', description: '' })
        },
        onError: () => toast.error('Failed to add earning'),
    })

    const deleteMutation = useMutation({
        mutationFn: (earningId: string) => busesAPI.deleteEarning(busId, earningId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busEarnings', busId] })
            queryClient.invalidateQueries({ queryKey: ['busProfile', busId] })
            toast.success('Earning deleted')
        },
    })

    const earnings = earningsData?.data || []
    const earningTypes = [
        { value: 'trip', label: 'Trip Fee' },
        { value: 'monthly', label: 'Monthly Subscription' },
        { value: 'special', label: 'Special Trip' },
        { value: 'other', label: 'Other' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Earnings</h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                    <FiPlus /> Add Earning
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.earning_type}
                                onChange={(e) => setFormData({ ...formData, earning_type: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                {earningTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Details..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">
                            Cancel
                        </button>
                        <button
                            onClick={() => addMutation.mutate(formData)}
                            disabled={addMutation.isPending || !formData.amount}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                            {addMutation.isPending ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                </div>
            )}

            {/* Earnings Table */}
            {isLoading ? (
                <div className="text-center py-8">Loading earnings...</div>
            ) : earnings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No earnings recorded yet</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-500 border-b">
                                <th className="pb-3">Date</th>
                                <th className="pb-3">Type</th>
                                <th className="pb-3">Description</th>
                                <th className="pb-3 text-right">Amount</th>
                                <th className="pb-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(earnings) && earnings.map((earning: any) => (
                                <tr key={earning.id} className="border-b last:border-0">
                                    <td className="py-3 text-sm">{earning.date}</td>
                                    <td className="py-3">
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                            {earning.earning_type_display}
                                        </span>
                                    </td>
                                    <td className="py-3 text-sm text-gray-600">{earning.description || '-'}</td>
                                    <td className="py-3 text-right font-medium text-green-600">₹{parseFloat(earning.amount).toLocaleString()}</td>
                                    <td className="py-3 text-right">
                                        <button
                                            onClick={() => deleteMutation.mutate(earning.id)}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// Students Tab
function StudentsTab({ busId }: { busId: string }) {
    const { data: studentsData, isLoading } = useQuery({
        queryKey: ['busStudents', busId],
        queryFn: () => busesAPI.listStudents(busId),
    })

    const students = studentsData?.data?.students || []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assigned Students ({students.length})</h3>
            </div>

            {isLoading ? (
                <div className="text-center py-8">Loading students...</div>
            ) : students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No students assigned to this bus</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student: any) => (
                        <div key={student.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-medium">
                                {student.full_name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{student.full_name}</p>
                                <p className="text-sm text-gray-500">
                                    {student.class_name} {student.section && `- ${student.section}`}
                                </p>
                            </div>
                            <div className="text-right text-xs text-gray-400">
                                <p>{student.stop_name || 'No stop'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// Analytics Tab
function AnalyticsTab({ busId }: { busId: string }) {
    const [days, setDays] = useState(30)

    const { data: analyticsData, isLoading } = useQuery({
        queryKey: ['busAnalytics', busId, days],
        queryFn: () => busesAPI.getAnalytics(busId, { days }),
    })

    const analytics = analyticsData?.data

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
                <select
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={365}>Last year</option>
                </select>
            </div>

            {isLoading ? (
                <div className="text-center py-8">Loading analytics...</div>
            ) : (
                <div className="space-y-6">
                    {/* Expenses by Category */}
                    {analytics?.expenses_by_category && analytics.expenses_by_category.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-800 mb-3">Expenses by Category</h4>
                            <div className="space-y-2">
                                {analytics.expenses_by_category.map((item: any) => (
                                    <div key={item.category} className="flex items-center gap-3">
                                        <div className="w-32 text-sm text-gray-600 capitalize">{item.category}</div>
                                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="bg-red-500 h-full rounded-full"
                                                style={{ width: `${(item.total / (analytics.expenses_by_category[0]?.total || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="w-24 text-right text-sm font-medium">₹{item.total?.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Monthly Summary */}
                    {analytics?.monthly_summary && analytics.monthly_summary.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-800 mb-3">Monthly Earnings vs Expenses</h4>
                            <div className="grid grid-cols-6 gap-2 text-center text-xs">
                                {analytics.monthly_summary.map((item: any) => (
                                    <div key={item.month} className="bg-gray-50 rounded p-2">
                                        <p className="text-gray-500 mb-1">{item.month}</p>
                                        <p className="text-green-600 font-medium">+₹{item.earnings?.toLocaleString()}</p>
                                        <p className="text-red-600 font-medium">-₹{item.expenses?.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(!analytics?.expenses_by_category?.length && !analytics?.monthly_summary?.length) && (
                        <div className="text-center py-8 text-gray-500">
                            No analytics data available for the selected period
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
