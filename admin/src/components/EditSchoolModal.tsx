import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition, Tab } from '@headlessui/react'
import { FiX, FiInfo, FiBook, FiLayout, FiUser, FiLock, FiUpload, FiCamera } from 'react-icons/fi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import SearchableSelect from './SearchableSelect'

interface EditSchoolModalProps {
    isOpen: boolean
    onClose: () => void
    school: any
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

const INDIAN_STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
    'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const BOARDS = [
    'CBSE (Central Board of Secondary Education)',
    'ICSE (Indian Certificate of Secondary Education)',
    'ISC (Indian School Certificate)',
    'IB (International Baccalaureate)',
    'IGCSE (International General Certificate of Secondary Education)',
    'NIOS (National Institute of Open Schooling)',
    'State Board - Andhra Pradesh',
    'State Board - Arunachal Pradesh',
    'State Board - Assam (SEBA/AHSEC)',
    'State Board - Bihar (BSEB)',
    'State Board - Chhattisgarh (CGBSE)',
    'State Board - Goa (GBSHSE)',
    'State Board - Gujarat (GSEB)',
    'State Board - Haryana (HBSE)',
    'State Board - Himachal Pradesh (HPBOSE)',
    'State Board - Jammu & Kashmir (JKBOSE)',
    'State Board - Jharkhand (JAC)',
    'State Board - Karnataka (KSEEB/PUE)',
    'State Board - Kerala (KBPE/DHSE)',
    'State Board - Madhya Pradesh (MPBSE)',
    'State Board - Maharashtra (MSBSHSE)',
    'State Board - Manipur (BSEM/COHSEM)',
    'State Board - Meghalaya (MBOSE)',
    'State Board - Mizoram (MBSE)',
    'State Board - Nagaland (NBSE)',
    'State Board - Odisha (BSE/CHSE)',
    'State Board - Punjab (PSEB)',
    'State Board - Rajasthan (RBSE)',
    'State Board - Sikkim',
    'State Board - Tamil Nadu (TN Board)',
    'State Board - Telangana (BSE/TSBIE)',
    'State Board - Tripura (TBSE)',
    'State Board - Uttar Pradesh (UPMSP)',
    'State Board - Uttarakhand (UBSE)',
    'State Board - West Bengal (WBBSE/WBCHSE)',
    'CIE (Cambridge International Examinations)',
    'Other'
]
const MEDIUMS = [
    'English', 'Hindi', 'Assamese', 'Bengali', 'Bodo', 'Dogri', 'Gujarati', 'Kannada', 'Kashmiri', 'Konkani', 'Maithili', 'Malayalam', 'Manipuri', 'Marathi', 'Nepali', 'Odia', 'Punjabi', 'Sanskrit', 'Santali', 'Sindhi', 'Tamil', 'Telugu', 'Urdu', 'Regional', 'Bilingual', 'Other'
]

const SCHOOL_TYPES = [
    { id: 'co-ed', name: 'Co-Education' },
    { id: 'boys', name: 'Boys Only' },
    { id: 'girls', name: 'Girls Only' }
]

const YEARS = Array.from({ length: 150 }, (_, i) => (new Date().getFullYear() - i).toString())
const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

const STREAMS_LIST = ['Science', 'Commerce', 'Arts', 'Vocational']

export default function EditSchoolModal({ isOpen, onClose, school }: EditSchoolModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState<any>({
        // Profile
        name: '', code: '', phone: '', email: '', website: '',
        address: '', city: '', state: '', pincode: '', country: 'India',

        // Academic
        board: '', medium: '', school_type: '', established_year: '',
        affiliation_number: '', udise_code: '', low_class: '', high_class: '',
        streams: [], // Array

        // Infra
        capacity: '', teacher_count: '', staff_count: '',
        facilities: [], // Array

        // Principal
        principal_name: '', principal_email: '', principal_phone: '',

        // Admin
        admin_email: '', admin_phone: '', admin_password: ''
    })

    const [initialData, setInitialData] = useState<any>(null)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    // Fetch full details because listing API might be partial
    // Use different query key to avoid cache collision with SchoolDetail page
    const { data: fullSchool, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['school-edit', school?.id],
        queryFn: async () => {
            const res = await schoolsAPI.get(school.id)
            return res.data // Return just the school object
        },
        enabled: !!school?.id && isOpen,
        staleTime: 0, // Always refetch when modal opens
    })

    useEffect(() => {
        if (!isOpen) return // Don't run when modal is closed

        const source = fullSchool || school
        if (source) {
            const data = {
                // Profile
                name: source.name || '',
                code: source.code || '',
                phone: source.phone || '',
                email: source.email || '',
                website: source.website || '',
                address: source.address || '',
                city: source.city || '',
                state: source.state || '',
                pincode: source.pincode || '',
                country: source.country || 'India',

                // Academic
                board: source.board || '',
                medium: source.medium || '',
                school_type: source.school_type || '',
                established_year: source.established_year || '',
                affiliation_number: source.affiliation_number || '',
                udise_code: source.udise_code || '',
                low_class: source.low_class || '',
                high_class: source.high_class || '',
                streams: Array.isArray(source.streams) ? source.streams : [],

                // Infra
                capacity: source.capacity || '',
                teacher_count: source.teacher_count || '',
                staff_count: source.staff_count || '',
                facilities: Array.isArray(source.facilities) ? source.facilities : [],

                // Principal
                principal_name: source.principal_name || '',
                principal_email: source.principal_email || '',
                principal_phone: source.principal_phone || '',

                // Admin
                admin_email: source.admin_email || '',
                admin_phone: source.admin_phone || '',
                admin_password: ''
            }
            setFormData(data)
            setInitialData(data)
            // Reset logo preview when opening modal
            setLogoPreview(null)
            setLogoFile(null)
        }
    }, [school, fullSchool, isOpen])

    // Check if form has changes
    const hasChanges = (() => {
        if (!initialData) return false

        // Check if logo file was uploaded
        if (logoFile) return true

        // Check password first - if it has value, it's a change because initial is always empty
        if (formData.admin_password) return true

        const keys = Object.keys(formData)
        for (const key of keys) {
            if (key === 'facilities' || key === 'streams' || key === 'admin_password') continue
            if (formData[key] !== initialData[key]) return true
        }

        // Check facilities array
        const formFacilities = [...(formData.facilities || [])].sort()
        const initFacilities = [...(initialData.facilities || [])].sort()
        if (formFacilities.length !== initFacilities.length) return true
        if (!formFacilities.every((val: any, index: any) => val === initFacilities[index])) return true

        // Check streams array
        const formStreams = [...(formData.streams || [])].sort()
        const initStreams = [...(initialData.streams || [])].sort()
        if (formStreams.length !== initStreams.length) return true
        return !formStreams.every((val: any, index: any) => val === initStreams[index])
    })()

    const updateMutation = useMutation({
        mutationFn: (data: any) => schoolsAPI.update(school.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school', school.id] })
            queryClient.invalidateQueries({ queryKey: ['school-edit', school.id] })
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success('School details updated successfully')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update school')
        }
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }))
    }

    const handleSchoolTypeChange = (nameString: string) => {
        // Convert display name back to ID
        const selected = SCHOOL_TYPES.find(t => t.name === nameString)
        if (selected) {
            handleSelectChange('school_type', selected.id)
        }
    }

    const handleFacilityToggle = (facility: string) => {
        setFormData((prev: any) => {
            const facilities = prev.facilities || []
            if (facilities.includes(facility)) {
                return { ...prev, facilities: facilities.filter((f: string) => f !== facility) }
            } else {
                return { ...prev, facilities: [...facilities, facility] }
            }
        })
    }

    const handleStreamToggle = (stream: string) => {
        setFormData((prev: any) => {
            const streams = prev.streams || []
            if (streams.includes(stream)) {
                return { ...prev, streams: streams.filter((s: string) => s !== stream) }
            } else {
                return { ...prev, streams: [...streams, stream] }
            }
        })
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Use FormData for file upload
        const submitData = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                submitData.append(key, JSON.stringify(value))
            } else if (value !== null && value !== undefined && value !== '') {
                submitData.append(key, value as string)
            }
        })
        if (logoFile) {
            submitData.append('logo', logoFile)
        }
        updateMutation.mutate(submitData)
    }

    const tabs = [
        { name: 'Profile', icon: FiInfo },
        { name: 'Academic', icon: FiBook },
        { name: 'Infrastructure', icon: FiLayout },
        { name: 'Principal', icon: FiUser },
        { name: 'Admin Account', icon: FiLock },
    ]

    const FACILITIES_LIST = [
        "Transport", "Hostel", "Library", "Sports Ground", "Science Lab",
        "Computer Lab", "Auditorium", "Smart Classes", "Cafeteria", "Medical Room",
        "Wi-Fi", "CCTV", "Gym", "Swimming Pool"
    ]

    // Helper to get display name for school type
    const getSchoolTypeName = (id: string) => {
        return SCHOOL_TYPES.find(t => t.id === id)?.name || ''
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
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
                    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
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
                            <Dialog.Panel className="w-full md:w-[70%] max-w-7xl transform rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                                        Edit School Profile
                                        {isLoadingDetails && <span className="ml-2 text-sm font-normal text-gray-400">(Loading details...)</span>}
                                    </Dialog.Title>
                                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-500">
                                        <FiX className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <Tab.Group>
                                        <div className="flex flex-col md:flex-row gap-6 min-h-[60vh]">
                                            {/* Sidebar Tabs */}
                                            <Tab.List className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2 min-w-[200px] bg-gray-50/50 p-2 rounded-xl h-fit">
                                                {tabs.map((tab) => (
                                                    <Tab
                                                        key={tab.name}
                                                        className={({ selected }) =>
                                                            classNames(
                                                                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all outline-none',
                                                                selected
                                                                    ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-200'
                                                                    : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                                                            )
                                                        }
                                                    >
                                                        <tab.icon className="w-4 h-4" />
                                                        {tab.name}
                                                    </Tab>
                                                ))}
                                            </Tab.List>

                                            {/* Content */}
                                            <Tab.Panels className="flex-1">
                                                {/* Profile */}
                                                <Tab.Panel className="space-y-4 animate-fade-in focus:outline-none">
                                                    {/* Logo Upload Section */}
                                                    <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                        <div className="relative group">
                                                            {logoPreview || fullSchool?.logo ? (
                                                                <img
                                                                    src={logoPreview || fullSchool?.logo}
                                                                    alt="School Logo"
                                                                    className="w-24 h-24 rounded-xl object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-24 h-24 bg-primary-100 rounded-xl flex items-center justify-center">
                                                                    <span className="text-primary-700 font-bold text-3xl">{formData.name?.[0]}</span>
                                                                </div>
                                                            )}
                                                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                                <FiCamera className="w-6 h-6 text-white" />
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={handleLogoChange}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-gray-900">School Logo</h3>
                                                            <p className="text-xs text-gray-500 mt-1">This appears as the school's profile picture across the platform.</p>
                                                            <label className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 cursor-pointer transition-colors">
                                                                <FiUpload className="w-3 h-3 mr-1.5" />
                                                                Upload New Logo
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={handleLogoChange}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Field label="School Name" name="name" value={formData.name} onChange={handleChange} required />
                                                        <Field label="School Code" name="code" value={formData.code} onChange={handleChange} disabled />
                                                        <Field label="Official Email" name="email" value={formData.email} onChange={handleChange} type="email" />
                                                        <Field label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
                                                        <Field label="Website" name="website" value={formData.website} onChange={handleChange} className="md:col-span-2" />
                                                        <div className="md:col-span-2">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                                            <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="input-field w-full" />
                                                        </div>
                                                        <Field label="City" name="city" value={formData.city} onChange={handleChange} />
                                                        <div className="w-full">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                                                            <SearchableSelect
                                                                value={formData.state}
                                                                onChange={(val) => handleSelectChange('state', val)}
                                                                options={INDIAN_STATES}
                                                                placeholder="Select State"
                                                            />
                                                        </div>
                                                        <Field label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
                                                        <Field label="Country" name="country" value={formData.country} onChange={handleChange} />
                                                    </div>
                                                </Tab.Panel>

                                                {/* Academic */}
                                                <Tab.Panel className="space-y-4 animate-fade-in focus:outline-none">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="w-full">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board</label>
                                                            <SearchableSelect
                                                                value={formData.board}
                                                                onChange={(val) => handleSelectChange('board', val)}
                                                                options={BOARDS}
                                                                placeholder="Select Board"
                                                            />
                                                        </div>
                                                        <div className="w-full">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Medium</label>
                                                            <SearchableSelect
                                                                value={formData.medium}
                                                                onChange={(val) => handleSelectChange('medium', val)}
                                                                options={MEDIUMS}
                                                                placeholder="Select Medium"
                                                            />
                                                        </div>
                                                        <div className="w-full">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">School Type</label>
                                                            <SearchableSelect
                                                                value={getSchoolTypeName(formData.school_type)}
                                                                onChange={handleSchoolTypeChange}
                                                                options={SCHOOL_TYPES.map(t => t.name)}
                                                                placeholder="Select Type"
                                                            />
                                                        </div>
                                                        <div className="w-full">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Est. Year</label>
                                                            <SearchableSelect
                                                                value={formData.established_year}
                                                                onChange={(val) => handleSelectChange('established_year', val)}
                                                                options={YEARS}
                                                                placeholder="Select Year"
                                                            />
                                                        </div>
                                                        <Field label="Affiliation No." name="affiliation_number" value={formData.affiliation_number} onChange={handleChange} />
                                                        <Field label="UDISE Code" name="udise_code" value={formData.udise_code} onChange={handleChange} />
                                                        <div className="w-full">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Low Class</label>
                                                            <SearchableSelect
                                                                value={formData.low_class}
                                                                onChange={(val) => handleSelectChange('low_class', val)}
                                                                options={CLASSES}
                                                                placeholder="Select Class"
                                                            />
                                                        </div>
                                                        <div className="w-full">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">High Class</label>
                                                            <SearchableSelect
                                                                value={formData.high_class}
                                                                onChange={(val) => handleSelectChange('high_class', val)}
                                                                options={CLASSES}
                                                                placeholder="Select Class"
                                                            />
                                                        </div>
                                                    </div>
                                                    {(formData.high_class === '11' || formData.high_class === '12') && (
                                                        <div className="mt-4 animate-fade-in">
                                                            <label className="block text-sm font-medium text-gray-700 mb-3">Available Streams</label>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {STREAMS_LIST.map(stream => (
                                                                    <label key={stream} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(formData.streams || []).includes(stream)}
                                                                            onChange={() => handleStreamToggle(stream)}
                                                                            className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                                                                        />
                                                                        <span className="text-sm text-gray-700">{stream}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Tab.Panel>

                                                {/* Infrastructure */}
                                                <Tab.Panel className="space-y-6 animate-fade-in focus:outline-none">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <Field label="Student Capacity" name="capacity" value={formData.capacity} onChange={handleChange} type="number" />
                                                        <Field label="Teacher Count" name="teacher_count" value={formData.teacher_count} onChange={handleChange} type="number" />
                                                        <Field label="Staff Count" name="staff_count" value={formData.staff_count} onChange={handleChange} type="number" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-3">Facilities</label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                            {FACILITIES_LIST.map(f => (
                                                                <label key={f} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(formData.facilities || []).includes(f)}
                                                                        onChange={() => handleFacilityToggle(f)}
                                                                        className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                                                                    />
                                                                    <span className="text-sm text-gray-700">{f}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </Tab.Panel>

                                                {/* Principal */}
                                                <Tab.Panel className="space-y-4 animate-fade-in focus:outline-none">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <Field label="Principal Name" name="principal_name" value={formData.principal_name} onChange={handleChange} />
                                                        <Field label="Principal Email" name="principal_email" value={formData.principal_email} onChange={handleChange} type="email" />
                                                        <Field label="Principal Phone" name="principal_phone" value={formData.principal_phone} onChange={handleChange} />
                                                    </div>
                                                </Tab.Panel>

                                                {/* Admin Account */}
                                                <Tab.Panel className="space-y-4 animate-fade-in focus:outline-none">
                                                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-4">
                                                        <div className="flex items-start gap-3">
                                                            <FiLock className="w-5 h-5 text-orange-600 mt-0.5" />
                                                            <div>
                                                                <h4 className="text-sm font-semibold text-orange-800">Admin Credentials</h4>
                                                                <p className="text-xs text-orange-700 mt-1">
                                                                    Update the login details for the School Admin. Leave the password blank if you don't want to change it.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Field label="Admin Login Email" name="admin_email" value={formData.admin_email} onChange={handleChange} type="email" />
                                                        <Field label="Admin Login Phone" name="admin_phone" value={formData.admin_phone} onChange={handleChange} />
                                                        <div className="relative">
                                                            <Field
                                                                label="New Password"
                                                                name="admin_password"
                                                                value={formData.admin_password}
                                                                onChange={handleChange}
                                                                type="password"
                                                                placeholder="Leave blank to keep current password"
                                                            />
                                                        </div>
                                                    </div>
                                                </Tab.Panel>
                                            </Tab.Panels>
                                        </div>
                                    </Tab.Group>

                                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!hasChanges || updateMutation.isPending}
                                            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                                        >
                                            {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

function Field({ label, className = "", ...props }: any) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <input
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400
                focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 transition-all"
                {...props}
            />
        </div>
    )
}
