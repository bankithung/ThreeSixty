import { FiTrash2, FiUser, FiTruck, FiUsers, FiNavigation } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

interface BusCardProps {
    bus: any
    onDelete: (id: string) => void
    onTrack: (bus: any) => void
}

export default function BusCard({ bus, onDelete, onTrack }: BusCardProps) {
    const navigate = useNavigate()

    return (
        <div
            onClick={() => navigate(`/buses/${bus.id}`, { state: { schoolId: bus.school?.id || bus.school } })}
            className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer relative"
        >
            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900">{bus.number}</h3>
                            <span className={`w-2 h-2 rounded-full ${bus.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                        <p className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 inline-block font-mono">
                            {bus.registration_number}
                        </p>
                    </div>
                    {/* Actions Menu */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onTrack(bus)
                            }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50"
                            title="Track Live"
                        >
                            <FiNavigation />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm('Delete this vehicle?')) onDelete(bus.id)
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete"
                        >
                            <FiTrash2 />
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                        <FiUsers className="w-3.5 h-3.5 text-gray-400" />
                        <span>{bus.capacity} Seats</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <FiTruck className="w-3.5 h-3.5 text-gray-400" />
                        <span className="capitalize">{bus.fuel_type || 'Diesel'}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-gray-600">
                        <FiUser className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{bus.driver_name || 'No Driver'}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bus.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {bus.is_active ? 'Active' : 'Inactive'}
                </span>
                {bus.is_active && (
                    <div className="flex items-center text-xs text-blue-600 font-medium animate-pulse">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-1.5" />
                        Live Ready
                    </div>
                )}
            </div>
        </div>
    )
}
