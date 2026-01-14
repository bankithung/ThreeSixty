import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiSettings, FiCheck, FiPlus, FiAlertCircle, FiSearch, FiUsers, FiDollarSign } from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchFeatures } from '../store/slices/featuresSlice'
import { subscriptionsAPI, transactionsAPI } from '../lib/api'

export default function FeatureManagement() {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { items: features, status } = useAppSelector((state) => state.features)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    // Fetch subscriptions and transactions for stats
    const { data: subscriptionsData } = useQuery({
        queryKey: ['all_subscriptions'],
        queryFn: () => subscriptionsAPI.listSubscriptions(),
    })
    const subscriptions = subscriptionsData?.data?.results || []

    const { data: transactionsData } = useQuery({
        queryKey: ['all_transactions_for_features'],
        queryFn: () => transactionsAPI.list(),
    })
    const transactions = transactionsData?.data?.results || []

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchFeatures())
        }
    }, [status, dispatch])

    // Calculate stats per feature
    const featureStats = useMemo(() => {
        const stats: Record<string, { schools: number; revenue: number }> = {}
        features.forEach(f => {
            const featureSubs = subscriptions.filter((s: any) => s.feature === f.id && s.is_active)
            // Match transactions by feature ID OR by feature name in description (for unlinked transactions)
            const featureTxns = transactions.filter((t: any) =>
                (t.feature === f.id ||
                    (t.feature === null && t.description?.toLowerCase().includes(f.name.toLowerCase())))
                && t.status === 'paid'
            )
            stats[f.id] = {
                schools: featureSubs.length,
                revenue: featureTxns.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
            }
        })
        return stats
    }, [features, subscriptions, transactions])

    // Filtered features
    const filteredFeatures = useMemo(() => {
        return features.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.description.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && f.is_active) ||
                (statusFilter === 'inactive' && !f.is_active)
            return matchesSearch && matchesStatus
        })
    }, [features, searchQuery, statusFilter])

    if (status === 'loading' && features.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    // Stats
    const totalFeatures = features.length
    const activeFeatures = features.filter(f => f.is_active).length
    const totalRevenue = Object.values(featureStats).reduce((sum, s) => sum + s.revenue, 0)

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Filters Row */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-80">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search features..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    {/* Status Filter - Tab Style */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'all'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'active'
                                ? 'bg-white text-green-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'inactive'
                                ? 'bg-white text-gray-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/features/new')}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm whitespace-nowrap"
                >
                    <FiPlus className="mr-2" />
                    New Feature
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Total Features</p>
                        <p className="text-2xl font-bold text-gray-900">{totalFeatures}</p>
                    </div>
                    <div className="text-primary-600 bg-primary-50 p-3 rounded-lg">
                        <FiSettings className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Active Features</p>
                        <p className="text-2xl font-bold text-gray-900">{activeFeatures}</p>
                    </div>
                    <div className="text-green-600 bg-green-50 p-3 rounded-lg">
                        <FiCheck className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRevenue)}
                        </p>
                    </div>
                    <div className="text-amber-600 bg-amber-50 p-3 rounded-lg">
                        <FiDollarSign className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFeatures.map((feature) => {
                    const stats = featureStats[feature.id] || { schools: 0, revenue: 0 }
                    return (
                        <div
                            key={feature.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => navigate(`/features/${feature.id}`)}
                        >
                            <div className="absolute top-4 right-4">
                                {feature.is_active ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-2 pr-16 group-hover:text-primary-600 transition-colors">{feature.name}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2 h-10">{feature.description}</p>

                            {/* Stats Row */}
                            <div className="flex items-center gap-4 mb-4 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <FiUsers className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium">{stats.schools}</span>
                                    <span className="text-gray-400">schools</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <FiDollarSign className="w-4 h-4 text-green-500" />
                                    <span className="font-medium">
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.revenue)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <span className="font-bold text-xl text-gray-800">
                                    {feature.pricing_type === 'tiered' && feature.tiers?.length > 0 ? (
                                        <>
                                            <span className="text-sm font-normal text-gray-500">From </span>
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.min(...feature.tiers.map(t => t.price)))}
                                        </>
                                    ) : (
                                        <>
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(feature.price)}
                                            <span className="text-xs text-gray-500 font-normal">/mo</span>
                                        </>
                                    )}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/features/${feature.id}`)
                                    }}
                                    className="text-gray-400 hover:text-primary-600 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                                >
                                    <FiSettings className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )
                })}

                {filteredFeatures.length === 0 && status !== 'loading' && (
                    <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                            <FiAlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No Features Found</h3>
                        <p className="text-gray-500 mt-1">
                            {searchQuery || statusFilter !== 'all'
                                ? 'Try adjusting your filters.'
                                : 'Get started by creating your first feature.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
