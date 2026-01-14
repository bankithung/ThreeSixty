import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiChevronDown, FiCheckCircle } from 'react-icons/fi'
import { Listbox, Transition } from '@headlessui/react'
import toast from 'react-hot-toast'
import { useAppDispatch } from '../store'
import { createFeature, PricingTier } from '../store/slices/featuresSlice'

export default function AddFeature() {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        price: '',
        pricing_type: 'flat' as 'flat' | 'tiered',
        tiers: [] as PricingTier[],
        is_active: true
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!formData.name.trim()) {
            toast.error('Feature name is required')
            return
        }
        if (!formData.code.trim()) {
            toast.error('Feature code is required')
            return
        }
        if (formData.pricing_type === 'tiered' && formData.tiers.length === 0) {
            toast.error('Please add at least one pricing tier')
            return
        }

        setIsSubmitting(true)
        try {
            await dispatch(createFeature({
                name: formData.name,
                code: formData.code,
                description: formData.description,
                price: Number(formData.price) || 0,
                pricing_type: formData.pricing_type,
                tiers: formData.tiers,
                is_active: formData.is_active
            })).unwrap()

            toast.success('Feature created successfully!')
            navigate('/features')
        } catch (error) {
            console.error('Failed to create feature:', error)
            toast.error('Failed to create feature')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="animate-fade-in pb-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/features')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <FiArrowLeft className="text-xl text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create New Feature</h1>
                    <p className="text-gray-500 text-sm">Add a new feature to your marketplace</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form - Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Feature Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Transport Module, Attendance Tracker"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Feature Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="code"
                                        value={formData.code}
                                        onChange={handleChange}
                                        placeholder="e.g. transport_module (unique identifier)"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This will be used as a unique identifier. Use lowercase with underscores.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Describe what this feature offers and its key benefits..."
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Configuration</h2>
                            <div className="space-y-5">
                                {/* Pricing Model */}
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

                                {/* Flat Rate Price */}
                                {formData.pricing_type === 'flat' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price per Month (₹)</label>
                                        <input
                                            name="price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.price}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
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
                                                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                                            >
                                                <FiPlus className="w-4 h-4" /> Add Tier
                                            </button>
                                        </div>

                                        {formData.tiers.length === 0 && (
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                                                <p className="text-sm text-gray-500">No pricing tiers defined yet.</p>
                                                <button
                                                    type="button"
                                                    onClick={addTier}
                                                    className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                                >
                                                    + Add your first tier
                                                </button>
                                            </div>
                                        )}

                                        {formData.tiers.map((tier, index) => (
                                            <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">Min Students</label>
                                                        <input
                                                            type="number"
                                                            value={tier.min}
                                                            onChange={(e) => handleTierChange(index, 'min', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">Max Students</label>
                                                        <input
                                                            type="number"
                                                            value={tier.max ?? ''}
                                                            placeholder="∞ (Unlimited)"
                                                            onChange={(e) => handleTierChange(index, 'max', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">Price (₹/month)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={tier.price}
                                                            onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTier(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Right Column */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    name="is_active"
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-700">Feature Active</span>
                                    <p className="text-xs text-gray-500">When active, schools can subscribe to this feature</p>
                                </div>
                            </label>
                        </div>

                        {/* Actions Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiSave className="mr-2" />
                                    {isSubmitting ? 'Creating...' : 'Create Feature'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/features')}
                                    className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* Help Card */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Tips</h3>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li>• Use a unique code for each feature</li>
                                <li>• Tiered pricing scales based on school size</li>
                                <li>• Leave "Max Students" empty for unlimited</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
