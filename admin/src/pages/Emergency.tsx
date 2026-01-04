import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emergencyAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiAlertTriangle, FiCheck, FiPhone, FiMapPin, FiClock } from 'react-icons/fi'

export default function Emergency() {
    const queryClient = useQueryClient()
    const [filter, setFilter] = useState('active')

    const { data: alertsData, isLoading } = useQuery({
        queryKey: ['emergencies', filter],
        queryFn: () => emergencyAPI.list({ active: filter === 'active' ? 'true' : undefined }),
        refetchInterval: filter === 'active' ? 10000 : undefined, // Refresh active every 10s
    })

    const acknowledgeMutation = useMutation({
        mutationFn: (id: string) => emergencyAPI.acknowledge(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergencies'] })
            toast.success('Emergency acknowledged')
        },
    })

    const resolveMutation = useMutation({
        mutationFn: ({ id, notes }: { id: string; notes: string }) =>
            emergencyAPI.resolve(id, { resolution_notes: notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergencies'] })
            toast.success('Emergency resolved')
        },
    })

    const alerts = alertsData?.data?.results || alertsData?.data || []

    const typeColors: Record<string, string> = {
        accident: 'bg-red-100 text-red-700 border-red-300',
        breakdown: 'bg-orange-100 text-orange-700 border-orange-300',
        medical: 'bg-pink-100 text-pink-700 border-pink-300',
        security: 'bg-purple-100 text-purple-700 border-purple-300',
        other: 'bg-gray-100 text-gray-700 border-gray-300',
    }

    const statusColors: Record<string, string> = {
        active: 'bg-red-500',
        acknowledged: 'bg-yellow-500',
        responding: 'bg-blue-500',
        resolved: 'bg-green-500',
        false_alarm: 'bg-gray-500',
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {['active', 'all'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-white shadow-sm' : 'text-gray-500'
                                    }`}
                            >
                                {f === 'active' ? 'Active' : 'All'}
                            </button>
                        ))}
                    </div>
                    {filter === 'active' && (
                        <div className="flex items-center text-sm text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                            Live Updates
                        </div>
                    )}
                </div>
            </div>

            {/* Active Alerts Banner */}
            {alerts.filter((a: any) => a.status === 'active').length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
                    <FiAlertTriangle className="w-6 h-6 text-red-500 mr-4" />
                    <div>
                        <p className="font-semibold text-red-700">
                            {alerts.filter((a: any) => a.status === 'active').length} Active Emergency Alert(s)
                        </p>
                        <p className="text-sm text-red-600">Immediate attention required</p>
                    </div>
                </div>
            )}

            {/* Alerts List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
            ) : alerts.length > 0 ? (
                <div className="space-y-4">
                    {alerts.map((alert: any) => (
                        <div
                            key={alert.id}
                            className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${alert.status === 'active' ? 'border-red-500' :
                                    alert.status === 'acknowledged' ? 'border-yellow-500' : 'border-gray-300'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start">
                                    <div className={`p-3 rounded-lg ${typeColors[alert.emergency_type] || 'bg-gray-100'}`}>
                                        <FiAlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="font-semibold text-gray-800 capitalize">
                                            {alert.emergency_type?.replace('_', ' ')} Emergency
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Raised by {alert.raised_by_name}
                                        </p>
                                        {alert.description && (
                                            <p className="text-sm text-gray-600 mt-2">{alert.description}</p>
                                        )}

                                        <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                                            <span className="flex items-center">
                                                <FiClock className="w-4 h-4 mr-1" />
                                                {new Date(alert.created_at).toLocaleString()}
                                            </span>
                                            {alert.bus_number && (
                                                <span>Bus {alert.bus_number}</span>
                                            )}
                                            {alert.latitude && alert.longitude && (
                                                <a
                                                    href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center text-primary-500 hover:underline"
                                                >
                                                    <FiMapPin className="w-4 h-4 mr-1" />
                                                    View Location
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${statusColors[alert.status]}`} />
                                    <span className="text-sm font-medium capitalize">
                                        {alert.status?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            {(alert.status === 'active' || alert.status === 'acknowledged') && (
                                <div className="mt-4 pt-4 border-t flex items-center space-x-3">
                                    {alert.status === 'active' && (
                                        <button
                                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                                            disabled={acknowledgeMutation.isPending}
                                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
                                        >
                                            Acknowledge
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            const notes = prompt('Resolution notes (optional):')
                                            resolveMutation.mutate({ id: alert.id, notes: notes || '' })
                                        }}
                                        disabled={resolveMutation.isPending}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                                    >
                                        <FiCheck className="inline mr-1" />
                                        Resolve
                                    </button>
                                    <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium">
                                        <FiPhone className="inline mr-1" />
                                        Call Conductor
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                    <FiAlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No emergency alerts</p>
                    <p className="text-sm mt-2">All systems operating normally</p>
                </div>
            )}
        </div>
    )
}
