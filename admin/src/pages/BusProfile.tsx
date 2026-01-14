import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { busesAPI, routesAPI } from '../lib/api'
import { useBusSocket } from '../hooks/useBusSocket'
import toast from 'react-hot-toast'
import {
    FiMapPin, FiUsers,
    FiActivity, FiDroplet, FiClock,
    FiPlus, FiTrash2, FiEdit, FiX
} from 'react-icons/fi'

// New Components
import BusHeader from '../components/transport/profile/BusHeader'
import BusOverview from '../components/transport/profile/BusOverview'
import BusFinancials from '../components/transport/profile/BusFinancials'
import BusStudents from '../components/transport/profile/BusStudents'

// Legacy Components (To be refactored later, kept for functionality)
import StopMapEditor from '../components/StopMapEditor'
import ManageStopStudentsModal from '../components/ManageStopStudentsModal'

type TabType = 'overview' | 'routes' | 'telemetry' | 'fuel' | 'expenses' | 'students'

const TABS: { id: TabType; label: string; icon?: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'routes', label: 'Routes & Stops' },
    { id: 'telemetry', label: 'Telemetry' },
    { id: 'fuel', label: 'Fuel & Maintenance' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'students', label: 'Students' },
]

export default function BusProfile() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState<TabType>('overview')

    const { data: busData, isLoading, error } = useQuery({
        queryKey: ['busProfile', id],
        queryFn: () => busesAPI.getProfile(id!),
        enabled: !!id,
    })

    const { liveStatus } = useBusSocket(id)
    const bus = busData?.data

    const handleBack = () => {
        navigate(-1)
    }

    if (isLoading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>
    if (error || !bus) return <div className="p-8 text-center text-red-500">Failed to load bus profile.</div>

    return (
        <div className="min-h-screen bg-white animate-fade-in">
            <BusHeader
                busNumber={bus.number}
                registrationNumber={bus.registration_number}
                isActive={bus.is_active}
                hasActiveTrip={liveStatus?.has_active_trip}
                onBack={handleBack}
            />

            {/* Tabs */}
            <div className="border-b border-gray-200 px-8">
                <nav className="flex gap-8 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="bg-gray-50 min-h-[calc(100vh-200px)]">
                {activeTab === 'overview' && (
                    <div className="space-y-6 pb-12">
                        <BusOverview bus={bus} liveStatus={liveStatus} />
                        <div className="max-w-7xl mx-auto px-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Financial Performance</h3>
                            <BusFinancials
                                totalEarnings={bus.total_earnings || 0}
                                totalExpenses={bus.total_expenses || 0}
                            />
                        </div>
                    </div>
                )}

                {/* Specific Tab Containers */}
                <div className="max-w-7xl mx-auto px-8 py-8">
                    {activeTab === 'routes' && <RoutesTab busId={id!} />}
                    {activeTab === 'telemetry' && <TelemetryTab bus={bus} />}
                    {activeTab === 'fuel' && <FuelTab busId={id!} />}
                    {activeTab === 'expenses' && <ExpensesTab busId={id!} />}
                    {activeTab === 'students' && <BusStudents busId={id!} />}
                </div>
            </div>
        </div>
    )
}

// ==========================================
// LEGACY TAB COMPONENTS (Preserved functionality)
// ==========================================

function RoutesTab({ busId }: { busId: string }) {
    const queryClient = useQueryClient()
    const [editingRoute, setEditingRoute] = useState<any>(null)
    const [managingStop, setManagingStop] = useState<{ routeId: string, stop: any } | null>(null)

    const { data: routesData, isLoading } = useQuery({
        queryKey: ['routes', { bus_id: busId }],
        queryFn: () => routesAPI.list({ bus_id: busId, include_stops: 'true' }),
    })

    const { data: routeStopsData } = useQuery({
        queryKey: ['routeStops', editingRoute?.id],
        queryFn: async () => routesAPI.getStops(editingRoute!.id),
        enabled: !!editingRoute?.id,
    })

    const updateStopsMutation = useMutation({
        mutationFn: ({ routeId, stops }: { routeId: string; stops: any[] }) => routesAPI.replaceStops(routeId, stops),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: ['routes'] })
            queryClient.invalidateQueries({ queryKey: ['routeStops', variables.routeId] })
            toast.success('Stops updated successfully')
            setEditingRoute(null)
        },
        onError: (error: any) => toast.error('Failed to update stops')
    })

    const routes = routesData?.data?.results || routesData?.data || []
    const routeStops = Array.isArray(routeStopsData?.data) ? routeStopsData.data : (routeStopsData?.data?.results || [])

    if (isLoading) return <div className="text-center py-8">Loading routes...</div>

    if (editingRoute) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Editing Route: {editingRoute.name}</h3>
                    <button onClick={() => setEditingRoute(null)} className="p-2 hover:bg-gray-100 rounded-full">
                        <FiX className="w-5 h-5" />
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
            {routes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <FiMapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No routes assigned to this bus.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {routes.map((route: any) => (
                        <div key={route.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900">{route.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{route.description || 'No description'}</p>
                                </div>
                                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">
                                    {route.distance_km ? `${route.distance_km} km` : 'N/A'}
                                </span>
                            </div>
                            <div className="p-4 bg-gray-50 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <FiMapPin className="w-4 h-4" /> {route.stops_count} Stops
                                    </span>
                                    <button
                                        onClick={() => setEditingRoute(route)}
                                        className="text-blue-600 font-medium hover:underline text-sm"
                                    >
                                        Edit Stops
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <FiUsers className="w-4 h-4" /> {route.student_count} Students
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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

function TelemetryTab({ bus }: { bus: any }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={<FiMapPin />} label="Total Distance" value={`${bus.total_distance_km || 0} km`} color="blue" />
                <MetricCard icon={<FiClock />} label="Total Duration" value={`${bus.total_duration_hours || 0} hrs`} color="purple" />
                <MetricCard icon={<FiActivity />} label="Total Trips" value={bus.total_trips || 0} color="green" />
                <MetricCard icon={<FiDroplet />} label="Fuel Consumed" value={`${bus.total_fuel_liters || 0} L`} color="red" />
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
                <p className="text-gray-500">Detailed telemetry visualization coming soon.</p>
            </div>
        </div>
    )
}

function MetricCard({ icon, label, value, color }: any) {
    const bgColors: any = { blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600' }
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${bgColors[color]}`}>{icon}</div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    )
}

function FuelTab({ busId }: { busId: string }) {
    const queryClient = useQueryClient()
    const [showAddForm, setShowAddForm] = useState(false)
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], liters: '', cost: '', odometer_reading: '', notes: '' })

    const { data: fuelData } = useQuery({ queryKey: ['busFuel', busId], queryFn: () => busesAPI.listFuel(busId) })
    // Robust check: handle if API returns array directly or inside data property
    const fuel = Array.isArray(fuelData?.data) ? fuelData.data : (Array.isArray(fuelData) ? fuelData : [])

    const addMutation = useMutation({
        mutationFn: (data: any) => busesAPI.addFuel(busId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busFuel', busId] })
            toast.success('Entry added'); setShowAddForm(false); setFormData({ date: new Date().toISOString().split('T')[0], liters: '', cost: '', odometer_reading: '', notes: '' })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => busesAPI.deleteFuel(busId, id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['busFuel', busId] }); toast.success('Entry deleted') }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Fuel History</h3>
                <button onClick={() => setShowAddForm(!showAddForm)} className="btn-black text-sm flex items-center gap-2"><FiPlus /> Add Fuel</button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input-field" />
                        <input type="number" placeholder="Liters" value={formData.liters} onChange={e => setFormData({ ...formData, liters: e.target.value })} className="input-field" />
                        <input type="number" placeholder="Cost" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} className="input-field" />
                        <input type="number" placeholder="Odometer" value={formData.odometer_reading} onChange={e => setFormData({ ...formData, odometer_reading: e.target.value })} className="input-field" />
                    </div>
                    <button onClick={() => addMutation.mutate(formData)} className="btn-black w-full">Save Entry</button>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr><th className="p-4">Date</th><th className="p-4">Liters</th><th className="p-4">Cost</th><th className="p-4">Odometer</th><th className="p-4">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {fuel.map((f: any) => (
                            <tr key={f.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-900">{f.date}</td>
                                <td className="p-4">{f.liters} L</td>
                                <td className="p-4">₹{f.cost}</td>
                                <td className="p-4">{f.odometer_reading || '-'}</td>
                                <td className="p-4"><button onClick={() => deleteMutation.mutate(f.id)} className="text-red-500 hover:text-red-700"><FiTrash2 /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ExpensesTab({ busId }: { busId: string }) {
    // keeping it simple for now, echoing structure of FuelTab
    const queryClient = useQueryClient()
    const [showAddForm, setShowAddForm] = useState(false)
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], category: 'maintenance', amount: '', description: '' })
    const { data: expData } = useQuery({ queryKey: ['busExp', busId], queryFn: () => busesAPI.listExpenses(busId) })
    // Robust check: handle if API returns array directly or inside data property
    const expenses = Array.isArray(expData?.data) ? expData.data : (Array.isArray(expData) ? expData : [])

    const addMutation = useMutation({
        mutationFn: (data: any) => busesAPI.addExpense(busId, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['busExp', busId] }); toast.success('Added'); setShowAddForm(false) }
    })
    const deleteMutation = useMutation({
        mutationFn: (id: string) => busesAPI.deleteExpense(busId, id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['busExp', busId] }); toast.success('Deleted') }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Expenses</h3>
                <button onClick={() => setShowAddForm(!showAddForm)} className="btn-black text-sm flex items-center gap-2"><FiPlus /> Add Expense</button>
            </div>
            {showAddForm && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input-field" />
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="input-field">
                            <option value="maintenance">Maintenance</option><option value="repair">Repair</option><option value="other">Other</option>
                        </select>
                        <input type="number" placeholder="Amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="input-field" />
                        <input type="text" placeholder="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-field" />
                    </div>
                    <button onClick={() => addMutation.mutate(formData)} className="btn-black w-full">Save Expense</button>
                </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Amount</th><th className="p-4">Description</th><th className="p-4">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {expenses.map((e: any) => (
                            <tr key={e.id} className="hover:bg-gray-50">
                                <td className="p-4">{e.date}</td>
                                <td className="p-4 capitalize">{e.category}</td>
                                <td className="p-4 font-medium">₹{e.amount}</td>
                                <td className="p-4 text-gray-500">{e.description}</td>
                                <td className="p-4"><button onClick={() => deleteMutation.mutate(e.id)} className="text-red-500 hover:text-red-700"><FiTrash2 /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
