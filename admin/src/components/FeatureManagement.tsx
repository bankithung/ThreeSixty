import { Fragment } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Listbox, Transition } from '@headlessui/react'
import { subscriptionsAPI, schoolsAPI } from '../lib/api'
import { FiCheckCircle, FiXCircle, FiLock, FiChevronDown, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface FeatureManagementProps {
    school: any
    isRootAdmin: boolean
    onUpdate: (config: any) => void
}

export default function FeatureManagement({ school, isRootAdmin, onUpdate }: FeatureManagementProps) {
    const { data: featuresData, isLoading } = useQuery({
        queryKey: ['features'],
        queryFn: () => subscriptionsAPI.listFeatures(),
    })

    const updateMutation = useMutation({
        mutationFn: (newConfig: any) => schoolsAPI.update(school.id, { features_config: newConfig }),
        onSuccess: (data) => {
            toast.success('Feature configuration updated')
            onUpdate(data.data.features_config)
        },
        onError: () => toast.error('Failed to update features')
    })

    const features = featuresData?.data?.results || featuresData?.data || []

    // Config from DB (Overrides)
    const config = school.features_config || {}
    // Effective active features from backend (Subscriptions + Overrides)
    const activeFeatures = school.active_features || {}

    const handleOverrideChange = (featureCode: string, value: string) => {
        const newConfig = { ...config }

        if (value === 'default') {
            delete newConfig[featureCode]
        } else if (value === 'enable') {
            newConfig[featureCode] = true
        } else if (value === 'disable') {
            newConfig[featureCode] = false
        }

        updateMutation.mutate(newConfig)
    }

    if (isLoading) return <div className="py-8 text-center text-gray-500">Loading features...</div>

    const options = [
        { id: 'default', name: 'Default (Plan)', description: 'Use subscription' },
        { id: 'enable', name: 'Force Enable', description: 'Always active' },
        { id: 'disable', name: 'Force Disable', description: 'Always inactive' },
    ]

    return (
        <div className="overflow-visible min-h-[300px]">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-100 text-sm font-medium text-gray-500 bg-gray-50/50">
                        <th className="px-4 py-3">Feature</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Effective Status</th>
                        <th className="px-4 py-3 w-[240px]">Configuration</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {features.map((feature: any) => {
                        const code = feature.code
                        const isActive = activeFeatures[code]
                        const overrideState = config[code] // true, false, or undefined

                        // Determine Override Dropdown Value
                        let selectedOption = options[0]
                        if (overrideState === true) selectedOption = options[1]
                        if (overrideState === false) selectedOption = options[2]

                        return (
                            <tr key={code} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-4 py-4">
                                    <div className="font-semibold text-gray-900">{feature.name}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5 group-hover:text-gray-700 transition-colors">{code}</div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                                    {feature.description || '-'}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isActive
                                            ? 'bg-green-50 text-green-700 border border-green-100'
                                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                        {isActive ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiXCircle className="w-3.5 h-3.5" />}
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    {isRootAdmin ? (
                                        <div className="relative w-60">
                                            <Listbox value={selectedOption} onChange={(val) => handleOverrideChange(code, val.id)} disabled={updateMutation.isPending}>
                                                <div className="relative mt-1">
                                                    <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm border focus:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-300 sm:text-sm transition-all ${selectedOption.id !== 'default'
                                                            ? 'border-blue-200 bg-blue-50/50 text-blue-900'
                                                            : 'border-gray-200 text-gray-900 hover:border-gray-300'
                                                        }`}>
                                                        <span className="block truncate font-medium mr-4">{selectedOption.name}</span>
                                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                            {selectedOption.id !== 'default' ? (
                                                                <FiLock className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                                            ) : (
                                                                <FiChevronDown
                                                                    className="h-4 w-4 text-gray-400"
                                                                    aria-hidden="true"
                                                                />
                                                            )}
                                                        </span>
                                                    </Listbox.Button>
                                                    <Transition
                                                        as={Fragment}
                                                        leave="transition ease-in duration-100"
                                                        leaveFrom="opacity-100"
                                                        leaveTo="opacity-0"
                                                    >
                                                        <Listbox.Options className="absolute right-0 z-50 mt-1 max-h-60 w-60 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                                                            {options.map((option, personIdx) => (
                                                                <Listbox.Option
                                                                    key={personIdx}
                                                                    className={({ active }) =>
                                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                                                                        }`
                                                                    }
                                                                    value={option}
                                                                >
                                                                    {({ selected }) => (
                                                                        <>
                                                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                                {option.name}
                                                                            </span>
                                                                            <span className="block truncate text-xs text-gray-400 mt-0.5">
                                                                                {option.description}
                                                                            </span>
                                                                            {selected ? (
                                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                                                                                    <FiCheck className="h-4 w-4" aria-hidden="true" />
                                                                                </span>
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                </Listbox.Option>
                                                            ))}
                                                        </Listbox.Options>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-500 italic">Managed by Admin</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {features.length === 0 && (
                <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 mt-4">
                    No system features defined.
                    {isRootAdmin && <span className="block mt-1 text-xs">Create features in global settings.</span>}
                </div>
            )}
        </div>
    )
}
