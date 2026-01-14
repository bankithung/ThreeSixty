import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { FiX, FiDatabase, FiHardDrive, FiImage, FiFileText, FiServer } from 'react-icons/fi'

interface StorageDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    school: any
}

const PLAN_LIMITS: Record<string, number> = {
    'basic': 5 * 1024 * 1024 * 1024, // 5GB
    'standard': 20 * 1024 * 1024 * 1024, // 20GB
    'premium': 100 * 1024 * 1024 * 1024, // 100GB
}

export default function StorageDetailsModal({ isOpen, onClose, school }: StorageDetailsModalProps) {
    const totalUsage = school?.data_usage || 0
    const plan = school?.pricing_plan?.toLowerCase() || 'basic'
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS['basic']
    const usagePercent = Math.min(100, Math.round((totalUsage / limit) * 100))

    // Mock breakdown estimates for UI demonstration
    // In a real app, these would come from an API
    const breakdown = [
        { label: 'Student Photos', icon: FiImage, size: Math.round(totalUsage * 0.6), color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Documents', icon: FiFileText, size: Math.round(totalUsage * 0.25), color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'System Data', icon: FiServer, size: Math.round(totalUsage * 0.15), color: 'text-gray-600', bg: 'bg-gray-100' },
    ]

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <FiDatabase className="w-5 h-5 text-orange-600" />
                                        </div>
                                        Storage Analytics
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Overview Card */}
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Total Used</p>
                                            <p className="text-2xl font-bold text-gray-900">{formatSize(totalUsage)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Plan Limit</p>
                                            <p className="text-sm font-medium text-gray-700">{formatSize(limit)}</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : 'bg-orange-500'
                                                }`}
                                            style={{ width: `${usagePercent}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-center mt-2 text-gray-500">
                                        You have used <span className="font-semibold text-gray-900">{usagePercent}%</span> of your available storage.
                                    </p>
                                </div>

                                {/* Breakdown */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Storage Breakdown</h4>
                                    {breakdown.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${item.bg}`}>
                                                    <item.icon className={`w-4 h-4 ${item.color}`} />
                                                </div>
                                                <span className="font-medium text-gray-700">{item.label}</span>
                                            </div>
                                            <span className="text-sm font-mono text-gray-600 group-hover:text-gray-900">{formatSize(item.size)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors"
                                        onClick={onClose}
                                    >
                                        Close
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
