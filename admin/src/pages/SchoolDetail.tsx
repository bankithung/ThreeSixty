import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schoolsAPI, subscriptionsAPI } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import {
    FiUsers, FiTruck, FiMap, FiActivity, FiSettings,
    FiDollarSign, FiDatabase, FiLock, FiUnlock, FiLayers, FiArrowLeft
} from 'react-icons/fi'
import ConfirmationModal from '../components/ConfirmationModal'
import EditSchoolModal from '../components/EditSchoolModal'
import FeatureManagement from '../components/FeatureManagement'
import StorageDetailsModal from '../components/StorageDetailsModal'

export default function SchoolDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('overview')

    const isRootAdmin = user?.role === 'root_admin'

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

    const blockMutation = useMutation({
        mutationFn: ({ id, action }: { id: string; action: 'block' | 'unblock' }) => schoolsAPI.block(id, action),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['school', id] })
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            toast.success(data.data.message || 'School status updated')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update school status')
        }
    })

    const school = schoolData?.data
    const stats = statsData?.data

    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isStorageModalOpen, setIsStorageModalOpen] = useState(false)

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

    const handleBlockConfirm = () => {
        const action = school.is_active ? 'block' : 'unblock'
        blockMutation.mutate({ id: school.id, action })
        setIsBlockModalOpen(false)
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiActivity },
        { id: 'features', label: 'Features & Plan', icon: FiLayers },
        { id: 'financials', label: 'Financials', icon: FiDollarSign },
        { id: 'settings', label: 'Settings', icon: FiSettings },
    ]

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
            >
                <FiArrowLeft className="mr-2" />
                Back
            </button>

            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center">
                        {school.logo ? (
                            <img
                                src={school.logo}
                                alt={school.name}
                                className="w-16 h-16 rounded-xl object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                                <span className="text-primary-700 font-bold text-2xl">{school.name?.[0]}</span>
                            </div>
                        )}
                        <div className="ml-4">
                            <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
                            <div className="flex items-center text-sm text-gray-600 mt-1 font-medium">
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{school.code}</span>
                                <span className="mx-2 text-gray-400">•</span>
                                <span>{school.city}, {school.state}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${school.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}
                        >
                            {school.is_active ? 'Active' : 'Blocked'}
                        </span>
                        {isRootAdmin && (
                            <>
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="flex items-center px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium bg-white"
                                >
                                    <FiSettings className="mr-2" />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => setIsBlockModalOpen(true)}
                                    disabled={blockMutation.isPending}
                                    className={`flex items-center px-4 py-2 rounded-lg border transition-colors font-medium ${school.is_active
                                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                                        : 'border-green-200 text-green-600 hover:bg-green-50'
                                        }`}
                                >
                                    {school.is_active ? <FiLock className="mr-2" /> : <FiUnlock className="mr-2" />}
                                    {school.is_active ? 'Block Access' : 'Unblock Access'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tags / Plan Info */}
                <div className="mt-6 flex flex-wrap gap-2">
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                        Plan: {school.pricing_plan || 'Standard'}
                    </div>
                    {school.data_usage && (
                        <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm flex items-center">
                            <FiDatabase className="mr-1 w-3 h-3" />
                            {Math.round(school.data_usage / (1024 * 1024))} MB Used
                        </div>
                    )}
                </div>

                {/* Tabs Navigation */}
                <div className="flex space-x-1 mt-6 border-b">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon className={`mr-2 w-4 h-4 ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-500'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Key Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Students', value: stats?.total_students || 0, icon: FiUsers, color: 'blue', link: `/students?school=${id}` },
                            { label: 'Staff', value: stats?.total_staff || 0, icon: FiUsers, color: 'green', link: `/staff?school=${id}` },
                            { label: 'Buses', value: stats?.total_buses || 0, icon: FiTruck, color: 'purple', link: `/buses?school=${id}` },
                            {
                                label: 'Storage Used',
                                value: `${Math.round((school?.data_usage || 0) / (1024 * 1024))} MB`,
                                icon: FiDatabase,
                                color: 'orange',
                                action: () => setIsStorageModalOpen(true)
                            },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                                        <p className="text-3xl font-bold mt-1 text-gray-900">{stat.value}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg bg-${stat.color}-50`}>
                                        <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                                    </div>
                                </div>
                                {stat.link ? (
                                    <Link
                                        to={stat.link}
                                        className={`text-sm font-medium text-${stat.color}-600 hover:text-${stat.color}-800 flex items-center justify-center py-2 px-4 rounded-lg bg-${stat.color}-50 hover:bg-${stat.color}-100 transition-colors cursor-pointer w-full group`}
                                    >
                                        View All {stat.label}
                                        <FiArrowLeft className="ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                ) : (
                                    <button
                                        onClick={stat.action}
                                        className={`text-sm font-medium text-${stat.color}-600 hover:text-${stat.color}-800 flex items-center justify-center py-2 px-4 rounded-lg bg-${stat.color}-50 hover:bg-${stat.color}-100 transition-colors w-full group`}
                                    >
                                        View Storage details
                                        <FiArrowLeft className="ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Contact & Address */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <h2 className="text-lg font-semibold mb-4 text-gray-900">Contact Information</h2>
                            <dl className="space-y-4">
                                <div className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <dt className="text-gray-500">Phone</dt>
                                    <dd className="font-medium text-gray-900">{school.phone || '-'}</dd>
                                </div>
                                <div className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <dt className="text-gray-500">Email</dt>
                                    <dd className="font-medium text-gray-900">{school.email || '-'}</dd>
                                </div>
                                <div className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <dt className="text-gray-500">Website</dt>
                                    <dd className="font-medium text-gray-900 text-primary-600 truncate max-w-[200px]">
                                        {school.website ? <a href={school.website} target="_blank" rel="noreferrer">{school.website}</a> : '-'}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <h2 className="text-lg font-semibold mb-4 text-gray-900">Address</h2>
                            <p className="text-gray-600">{school.address}</p>
                            <p className="text-gray-600 mt-1">{school.city}, {school.state}</p>
                            <p className="text-gray-600">{school.pincode}</p>
                            <p className="text-gray-600">{school.country}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'features' && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Feature Management</h2>
                        {!isRootAdmin && <span className="text-xs text-gray-500">Contact support to change features</span>}
                    </div>

                    <FeatureManagement
                        school={school}
                        isRootAdmin={isRootAdmin}
                        onUpdate={() => {
                            // Optimistic update or refetch
                            queryClient.invalidateQueries({ queryKey: ['school', id] })
                        }}
                    />
                </div>
            )}

            {activeTab === 'financials' && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-fade-in">
                    <h2 className="text-lg font-semibold mb-6">Subscription History</h2>
                    <FinancialsTab schoolId={id!} />
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-fade-in">
                    <h2 className="text-lg font-semibold mb-6">Danger Zone</h2>
                    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                        <h3 className="text-red-800 font-medium">Block School Access</h3>
                        <p className="text-red-600 text-sm mt-1 mb-4">
                            Blocking this school will prevents all admins, staff, and parents from logging in.
                            This action takes effect immediately.
                        </p>
                        <button
                            onClick={() => setIsBlockModalOpen(true)}
                            disabled={blockMutation.isPending}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            {school.is_active ? 'Block School' : 'Unblock School'}
                        </button>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                onConfirm={handleBlockConfirm}
                title={school.is_active ? 'Block School Access' : 'Restore School Access'}
                message={school.is_active
                    ? `Are you sure you want to block ${school.name}? This will immediately prevent all admins, staff, parents, and students from accessing the platform.`
                    : `Are you sure you want to restore access for ${school.name}?`
                }
                confirmLabel={school.is_active ? 'Block School' : 'Restore Access'}
                variant={school.is_active ? 'danger' : 'info'}
            />

            <EditSchoolModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                school={school}
            />

            <StorageDetailsModal
                isOpen={isStorageModalOpen}
                onClose={() => setIsStorageModalOpen(false)}
                school={school}
            />
        </div>
    )
}

function FinancialsTab({ schoolId }: { schoolId: string }) {
    const { data: subsData, isLoading } = useQuery({
        queryKey: ['schoolSubscriptions', schoolId],
        queryFn: () => subscriptionsAPI.listSubscriptions({ school: schoolId }),
    })

    const subscriptions = subsData?.data?.results || subsData?.data || []

    if (isLoading) {
        return <div className="text-center py-8">Loading financial data...</div>
    }

    if (subscriptions.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-500">No subscriptions or transactions found for this school.</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4">Feature/Plan</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Start Date</th>
                        <th className="px-6 py-4">End Date</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {subscriptions.map((sub: any) => (
                        <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-800">
                                {sub.feature_details?.name || 'Standard Plan'}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {sub.is_active ? 'Active' : 'Expired'}
                                </span>
                            </td>
                            <td className="px-6 py-4">{new Date(sub.start_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Auto-renew'}</td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                                ₹{sub.feature_details?.price || '0.00'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
