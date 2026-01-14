import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsAPI, transactionsAPI } from '../lib/api'
import { FiArrowLeft, FiSave, FiUsers, FiDollarSign, FiActivity, FiCheckCircle, FiXCircle, FiPlus, FiTrash2, FiChevronDown } from 'react-icons/fi'
import { Listbox, Transition } from '@headlessui/react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchFeatures, updateFeature, PricingTier } from '../store/slices/featuresSlice'

export default function FeatureDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()

    // Select Feature from Store
    const { items: features, status } = useAppSelector((state) => state.features)
    const feature = features.find((f) => f.id === id)

    // Local State for "Dirty" checking
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        pricing_type: 'flat' as 'flat' | 'tiered',
        tiers: [] as PricingTier[],
        is_active: true
    })
    const [isDirty, setIsDirty] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')

    // Initial Fetch if store is empty
    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchFeatures())
        }
    }, [status, dispatch])

    // Hydrate form when feature loads
    useEffect(() => {
        if (feature) {
            setFormData({
                name: feature.name,
                description: feature.description,
                price: String(feature.price),
                pricing_type: feature.pricing_type || 'flat',
                tiers: feature.tiers || [],
                is_active: feature.is_active
            })
        }
    }, [feature])

    // Check IsDirty
    useEffect(() => {
        if (!feature) return
        const isModified =
            formData.name !== feature.name ||
            formData.description !== feature.description ||
            Number(formData.price) !== Number(feature.price) ||
            formData.pricing_type !== (feature.pricing_type || 'flat') ||
            JSON.stringify(formData.tiers) !== JSON.stringify(feature.tiers || []) ||
            formData.is_active !== feature.is_active

        setIsDirty(isModified)
    }, [formData, feature])

    // Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        setFormData(prev => ({ ...prev, [name]: val }))
    }

    const handleTierChange = (index: number, field: keyof PricingTier, value: string) => {
        setFormData(prev => {
            const newTiers = [...prev.tiers]
            newTiers[index] = { ...newTiers[index], [field]: value === '' ? null : Number(value) }
            return { ...prev, tiers: newTiers }
        })
    }

    const addTier = () => {
        setFormData(prev => ({
            ...prev,
            tiers: [...prev.tiers, { min: 0, max: null, price: 0 }]
        }))
    }

    const removeTier = (index: number) => {
        setFormData(prev => ({
            ...prev,
            tiers: prev.tiers.filter((_, i) => i !== index)
        }))
    }


    // Keep Subscribers & Transactions as React Query (as they are sub-details, not global state)
    const { data: subscribersData } = useQuery({
        queryKey: ['feature_subscribers', id],
        queryFn: () => subscriptionsAPI.listSubscriptions({ feature: id }),
        enabled: !!id
    })
    const subscribers = subscribersData?.data?.results || []

    const { data: transactionsData } = useQuery({
        queryKey: ['feature_transactions', id],
        queryFn: () => transactionsAPI.list({ feature: id }),
        enabled: !!id
    })
    const transactions = transactionsData?.data?.results || []

    // Calculate Stats
    const totalRevenue = transactions
        .filter((t: any) => t.status === 'paid')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const activeSubscribers = subscribers.filter((s: any) => s.is_active).length

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isDirty) return

        try {
            await dispatch(updateFeature({
                id: id!,
                data: {
                    name: formData.name,
                    description: formData.description,
                    price: Number(formData.price),
                    pricing_type: formData.pricing_type,
                    tiers: formData.tiers,
                    is_active: formData.is_active
                }
            })).unwrap()
            toast.success('Feature updated successfully')
            setIsDirty(false)
        } catch (error) {
            console.error('Failed to update feature:', error)
            toast.error('Failed to update feature')
        }
    }

    if (status === 'loading' && !feature) return <div className="p-8 text-center">Loading...</div>
    if (!feature && status === 'succeeded') return <div className="p-8 text-center">Feature not found</div>

    // Get display price
    const displayPrice = formData.pricing_type === 'tiered' && formData.tiers.length > 0
        ? `Starts at ₹${Math.min(...formData.tiers.map(t => t.price))}`
        : `₹${feature?.price}`

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/features')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiArrowLeft className="text-xl text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{feature?.name}</h1>
                        <p className="text-gray-500 text-sm">Manage feature settings and subscribers</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${feature?.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {feature?.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRevenue)}
                        </p>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <FiDollarSign className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Schools</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{activeSubscribers}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <FiUsers className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price / Month</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{displayPrice}</p>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <FiActivity className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('subscribers')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'subscribers' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Subscribers
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Transactions
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Pricing Model Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Model</label>
                                <Listbox
                                    value={formData.pricing_type}
                                    onChange={(value) => setFormData(prev => ({ ...prev, pricing_type: value }))}
                                >
                                    <div className="relative">
                                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2.5 pl-4 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                            <span className="block truncate">
                                                {formData.pricing_type === 'flat' ? 'Flat Rate (Fixed Price)' : 'Tiered Pricing (Based on Students)'}
                                            </span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <FiChevronDown className="h-5 w-5 text-gray-400" />
                                            </span>
                                        </Listbox.Button>
                                        <Transition
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                        >
                                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                <Listbox.Option
                                                    value="flat"
                                                    className={({ active, selected }) =>
                                                        `relative cursor-pointer select-none py-2.5 px-4 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                                                        } ${selected ? 'bg-primary-50 font-medium' : ''}`
                                                    }
                                                >
                                                    {({ selected }) => (
                                                        <div className="flex items-center justify-between">
                                                            <span>Flat Rate (Fixed Price)</span>
                                                            {selected && <FiCheckCircle className="w-4 h-4 text-primary-600" />}
                                                        </div>
                                                    )}
                                                </Listbox.Option>
                                                <Listbox.Option
                                                    value="tiered"
                                                    className={({ active, selected }) =>
                                                        `relative cursor-pointer select-none py-2.5 px-4 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                                                        } ${selected ? 'bg-primary-50 font-medium' : ''}`
                                                    }
                                                >
                                                    {({ selected }) => (
                                                        <div className="flex items-center justify-between">
                                                            <span>Tiered Pricing (Based on Students)</span>
                                                            {selected && <FiCheckCircle className="w-4 h-4 text-primary-600" />}
                                                        </div>
                                                    )}
                                                </Listbox.Option>
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>
                            </div>

                            {/* Flat Rate */}
                            {formData.pricing_type === 'flat' && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹/month)</label>
                                        <input
                                            name="price"
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <div className="flex items-center h-[42px] px-4 border border-gray-200 rounded-lg bg-gray-50">
                                            <label className="flex items-center gap-3 cursor-pointer w-full">
                                                <input
                                                    name="is_active"
                                                    type="checkbox"
                                                    checked={formData.is_active}
                                                    onChange={handleChange}
                                                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Feature Active</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tiered Pricing */}
                            {formData.pricing_type === 'tiered' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700">Pricing Tiers</label>
                                        <button
                                            type="button"
                                            onClick={addTier}
                                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                        >
                                            <FiPlus className="w-4 h-4" /> Add Tier
                                        </button>
                                    </div>

                                    {formData.tiers.length === 0 && (
                                        <p className="text-sm text-gray-500 italic">No tiers defined. Add at least one.</p>
                                    )}

                                    {formData.tiers.map((tier, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex-1 grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Min Students</label>
                                                    <input
                                                        type="number"
                                                        value={tier.min}
                                                        onChange={(e) => handleTierChange(index, 'min', e.target.value)}
                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Max Students</label>
                                                    <input
                                                        type="number"
                                                        value={tier.max ?? ''}
                                                        placeholder="∞"
                                                        onChange={(e) => handleTierChange(index, 'max', e.target.value)}
                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={tier.price}
                                                        onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeTier(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="pt-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <div className="flex items-center h-[42px] px-4 border border-gray-200 rounded-lg bg-gray-50 w-fit">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    name="is_active"
                                                    type="checkbox"
                                                    checked={formData.is_active}
                                                    onChange={handleChange}
                                                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Feature Active</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={!isDirty}
                                    className={`flex items-center px-6 py-2.5 rounded-lg transition-colors shadow-sm font-medium
                                        ${isDirty
                                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                >
                                    <FiSave className="mr-2" />
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'subscribers' && (
                        <div>
                            {subscribers.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                            <th className="px-4 py-3">School</th>
                                            <th className="px-4 py-3">Start Date</th>
                                            <th className="px-4 py-3">Auto Renew</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {subscribers.map((sub: any) => (
                                            <tr key={sub.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {sub.school_logo ? (
                                                            <img
                                                                src={sub.school_logo}
                                                                alt={sub.school_name}
                                                                className="w-8 h-8 rounded-lg object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                {sub.school_name?.[0]}
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-gray-900">{sub.school_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">{format(new Date(sub.start_date), 'dd MMM yyyy')}</td>
                                                <td className="px-4 py-3">
                                                    {sub.auto_renew ? <FiCheckCircle className="text-green-500" /> : <FiXCircle className="text-gray-300" />}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {sub.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-500 text-center py-10">No subscribers yet.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div>
                            {transactions.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">School</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-500">{format(new Date(t.transaction_date), 'dd MMM yyyy')}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {t.school_logo ? (
                                                            <img
                                                                src={t.school_logo}
                                                                alt={t.school_name}
                                                                className="w-8 h-8 rounded-lg object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                {t.school_name?.[0]}
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-gray-900">{t.school_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-900">₹{t.amount}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize 
                                                        ${t.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                            t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-500 text-center py-10">No transactions found.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
