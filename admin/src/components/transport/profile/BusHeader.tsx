import { FiArrowLeft, FiEdit } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

interface BusHeaderProps {
    busNumber: string
    registrationNumber: string
    isActive: boolean
    hasActiveTrip?: boolean
    onBack?: () => void
}

export default function BusHeader({ busNumber, registrationNumber, isActive, hasActiveTrip, onBack }: BusHeaderProps) {
    const navigate = useNavigate()

    return (
        <div className="bg-white border-b border-gray-200 px-8 py-6 mb-6">
            <div className="flex items-start justify-between">
                <div>
                    <button
                        onClick={() => {
                            if (onBack) {
                                onBack()
                            } else {
                                navigate('/buses')
                            }
                        }}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <FiArrowLeft className="mr-2" />
                        Back to Fleet
                    </button>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{busNumber}</h1>
                        {isActive ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-50 border border-green-100 text-xs font-semibold text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Active
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                Inactive
                            </span>
                        )}
                        {hasActiveTrip && (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Live Trip
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 mt-1 font-mono text-sm">{registrationNumber}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <FiEdit className="mr-2 w-4 h-4" />
                        Edit details
                    </button>
                </div>
            </div>
        </div>
    )
}
