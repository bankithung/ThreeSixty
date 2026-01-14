import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiSave, FiMapPin, FiUser, FiInfo, FiBook, FiLayout, FiUserCheck, FiUpload, FiX } from 'react-icons/fi'
import LocationPicker, { AddressDetails } from '../components/LocationPicker'
import SearchableSelect from '../components/SearchableSelect'

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
    'English',
    'Hindi',
    'Assamese',
    'Bengali',
    'Bodo',
    'Dogri',
    'Gujarati',
    'Kannada',
    'Kashmiri',
    'Konkani',
    'Maithili',
    'Malayalam',
    'Manipuri',
    'Marathi',
    'Nepali',
    'Odia',
    'Punjabi',
    'Sanskrit',
    'Santali',
    'Sindhi',
    'Tamil',
    'Telugu',
    'Urdu',
    'Regional',
    'Bilingual',
    'Other'
]
const SCHOOL_TYPES = [
    { id: 'co-ed', name: 'Co-Education' },
    { id: 'boys', name: 'Boys Only' },
    { id: 'girls', name: 'Girls Only' }
]

const YEARS = Array.from({ length: 150 }, (_, i) => (new Date().getFullYear() - i).toString())
const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']


export default function AddSchool() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isLoading, setIsLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        secondary_phone: '',
        email: '',
        website: '',
        logo: null as File | null,
        udise_code: '',
        low_class: '',
        high_class: '',
        streams: [] as string[],
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        latitude: undefined as number | undefined,
        longitude: undefined as number | undefined,

        // Academic
        board: '',
        medium: '',
        school_type: 'co-ed',
        established_year: '',
        affiliation_number: '',

        // Infrastructure
        capacity: '',
        teacher_count: '',
        staff_count: '',
        facilities: [] as string[],

        // Principal
        principal_name: '',
        principal_email: '',
        principal_phone: '',

        // Admin Details
        admin_name: '',
        admin_email: '',
        admin_phone: '',
        admin_password: '',
    })

    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.size > 2 * 1024 * 1024) {
                toast.error('File size must be less than 2MB')
                return
            }
            setFormData({ ...formData, logo: file })
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const removeLogo = () => {
        setFormData({ ...formData, logo: null })
        setLogoPreview(null)
    }

    const createMutation = useMutation({
        mutationFn: (data: FormData) => schoolsAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success('School created successfully')
            navigate('/schools')
        },
        onError: (error: any) => {
            console.error('Create Error:', error);
            const data = error.response?.data;
            if (data) {
                if (data.detail) {
                    toast.error(data.detail);
                } else {
                    // Show first field error
                    const firstKey = Object.keys(data)[0];
                    if (firstKey) {
                        const message = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                        toast.error(`${firstKey}: ${message}`);
                    } else {
                        toast.error('Failed to create school');
                    }
                }
            } else {
                toast.error('Failed to create school');
            }
            setIsLoading(false)
        },
        onMutate: () => {
            setIsLoading(true)
        },
        onSettled: () => {
            setIsLoading(false)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Basic Validation
        if (!formData.name || !formData.admin_email || !formData.admin_password) {
            toast.error('Please fill in all required fields')
            return
        }

        const payload = new FormData()

        // Append basic fields
        Object.keys(formData).forEach(key => {
            const value = (formData as any)[key]
            if (key === 'facilities' || key === 'streams') {
                payload.append(key, JSON.stringify(value))
            } else if (key === 'logo') {
                if (value) payload.append('logo', value)
            } else if (value !== null && value !== undefined && value !== '') {
                payload.append(key, value.toString())
            }
        })

        // Ensure numerics are correct (FormData sends strings, but DRF handles basic conversions usually. Explicit check if needed)
        // For Established Year and Capacity, we rely on DRF's coercion or ensure valid string format.

        createMutation.mutate(payload)
    }

    const toggleFacility = (facility: string) => {
        if (formData.facilities.includes(facility)) {
            setFormData({ ...formData, facilities: formData.facilities.filter(f => f !== facility) })
        } else {
            setFormData({ ...formData, facilities: [...formData.facilities, facility] })
        }
    }

    const toggleStream = (stream: string) => {
        if (formData.streams.includes(stream)) {
            setFormData({ ...formData, streams: formData.streams.filter(s => s !== stream) })
        } else {
            setFormData({ ...formData, streams: [...formData.streams, stream] })
        }
    }

    const handleAddressSelect = (details: AddressDetails) => {
        setFormData(prev => ({
            ...prev,
            address: details.address || prev.address,
            city: details.city || prev.city,
            state: INDIAN_STATES.find(s => s.toLowerCase() === details.state.toLowerCase()) || details.state || prev.state,
            pincode: details.pincode || prev.pincode,
            latitude: prev.latitude,
            longitude: prev.longitude
        }))
    }

    const geocodeString = (query: string, type: 'city' | 'pincode') => {
        if (!window.google || !window.google.maps) return

        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ address: query + ', India' }, (results: any[], status: string) => {
            if (status === 'OK' && results[0]) {
                const place = results[0]
                const location = place.geometry.location

                let city = ''
                let state = ''
                let pincode = ''

                if (place.address_components) {
                    for (const component of place.address_components) {
                        const types = component.types
                        if (types.includes('locality')) city = component.long_name
                        if (!city && types.includes('administrative_area_level_2')) city = component.long_name
                        if (types.includes('administrative_area_level_1')) state = component.long_name
                        if (types.includes('postal_code')) pincode = component.long_name
                    }
                }

                setFormData(prev => {
                    const updates: any = {
                        latitude: location.lat(),
                        longitude: location.lng(),
                        state: INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase()) || state || prev.state
                    }

                    if (type === 'pincode') {
                        updates.city = city || prev.city
                        // Only update pincode if we found one, otherwise keep user input
                        if (pincode) updates.pincode = pincode
                    } else if (type === 'city') {
                        // If searching by city, we might get a generic pincode or none, 
                        // sometimes better to keep existing if specific, but user asked to update.
                        // We'll update only if empty or if we found a specific one.
                        if (pincode) updates.pincode = pincode
                    }

                    return { ...prev, ...updates }
                })
            }
        })
    }

    const handleInputBlur = (field: 'city' | 'pincode', value: string) => {
        if (!value) return
        geocodeString(value, field)
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between py-4 border-b border-gray-200 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-900"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Add New School</h1>
                        <p className="text-sm text-gray-500 hidden md:block">Register a new school with full academic and administrative details.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-70 shadow-sm shadow-primary-200"
                    >
                        <FiSave className="mr-2" />
                        {isLoading ? 'Creating...' : 'Create School'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - Main Details (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Basic Information Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <FiInfo className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        </div>

                        <div className="space-y-6">
                            {/* School Name - Full Width */}
                            <div>
                                <label className="label-required">School Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    placeholder="e.g. St. Mary's High School"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                {/* Left Column: Identity & Branding */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="label">Website</label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={e => setFormData({ ...formData, website: e.target.value })}
                                            className="input-field"
                                            placeholder="https://"
                                        />
                                    </div>

                                    <div>
                                        <label className="label">School Logo</label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative group">
                                            {logoPreview ? (
                                                <div className="relative">
                                                    <img
                                                        src={logoPreview}
                                                        alt="Logo preview"
                                                        className="h-32 object-contain rounded-md"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={removeLogo}
                                                        className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 text-center">
                                                    <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600">
                                                        <label
                                                            htmlFor="file-upload"
                                                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                                                        >
                                                            <span>Upload a file</span>
                                                            <input
                                                                id="file-upload"
                                                                name="file-upload"
                                                                type="file"
                                                                className="sr-only"
                                                                accept="image/png, image/jpeg, image/jpg"
                                                                onChange={handleLogoChange}
                                                            />
                                                        </label>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        PNG, JPG, GIF up to 2MB
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Contact Information */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-5">
                                    <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-3">Contact Information</h3>

                                    <div>
                                        <label className="label-required">School Official Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="input-field bg-white"
                                            placeholder="info@school.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label-required">School Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="input-field bg-white"
                                            placeholder="+91 98765 43210"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Secondary Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.secondary_phone}
                                            onChange={e => setFormData({ ...formData, secondary_phone: e.target.value })}
                                            className="input-field bg-white"
                                            placeholder="+91 98765 43210 (Optional)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Academic Details Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <FiBook className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Academic Details</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Row 1: Framework */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="label">Education Board</label>
                                    <SearchableSelect
                                        value={formData.board}
                                        onChange={value => setFormData({ ...formData, board: value })}
                                        options={BOARDS}
                                        placeholder="Select Board"
                                    />
                                </div>

                                <div>
                                    <label className="label">Medium of Instruction</label>
                                    <SearchableSelect
                                        value={formData.medium}
                                        onChange={value => setFormData({ ...formData, medium: value })}
                                        options={MEDIUMS}
                                        placeholder="Select Medium"
                                    />
                                </div>

                                <div>
                                    <label className="label">School Type</label>
                                    <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50 mt-1">
                                        {SCHOOL_TYPES.map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, school_type: type.id })}
                                                className={`flex-1 text-sm font-medium py-1.5 px-3 rounded-md transition-all ${formData.school_type === type.id
                                                    ? 'bg-white text-primary-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {type.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Official Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="label">UDISE Code</label>
                                    <input
                                        type="text"
                                        value={formData.udise_code}
                                        onChange={e => setFormData({ ...formData, udise_code: e.target.value })}
                                        className="input-field"
                                        placeholder="Unified District Code"
                                    />
                                </div>

                                <div>
                                    <label className="label">Affiliation Number</label>
                                    <input
                                        type="text"
                                        value={formData.affiliation_number}
                                        onChange={e => setFormData({ ...formData, affiliation_number: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. CBSE/AFF/..."
                                    />
                                </div>

                                <div>
                                    <label className="label">Established Year</label>
                                    <SearchableSelect
                                        value={formData.established_year}
                                        onChange={value => setFormData({ ...formData, established_year: value })}
                                        options={YEARS}
                                        placeholder="Select Year"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Structure */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <label className="label">Grade Levels (Low - High)</label>
                                    <div className="flex gap-2">
                                        <div className="w-1/2">
                                            <SearchableSelect
                                                value={formData.low_class}
                                                onChange={v => setFormData({ ...formData, low_class: v })}
                                                options={CLASSES}
                                                placeholder="Start"
                                            />
                                        </div>
                                        <span className="self-center text-gray-400">-</span>
                                        <div className="w-1/2">
                                            <SearchableSelect
                                                value={formData.high_class}
                                                onChange={v => setFormData({ ...formData, high_class: v })}
                                                options={CLASSES}
                                                placeholder="End"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {['11', '12'].includes(formData.high_class) && (
                                    <div className="md:col-span-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex flex-col justify-center">
                                        <label className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Available Streams</label>
                                        <div className="flex gap-4">
                                            {['Science', 'Commerce', 'Arts'].map(stream => (
                                                <label key={stream} className="flex items-center gap-2 cursor-pointer group">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.streams.includes(stream)
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'bg-white border-gray-300 group-hover:border-blue-400'
                                                        }`}>
                                                        {formData.streams.includes(stream) && <FiBook className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={formData.streams.includes(stream)}
                                                        onChange={() => toggleStream(stream)}
                                                    />
                                                    <span className={`text-sm font-medium transition-colors ${formData.streams.includes(stream) ? 'text-blue-700' : 'text-gray-600'
                                                        }`}>{stream}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Location Details Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <FiMapPin className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Location & Address</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label">Full Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    rows={3}
                                    className="input-field resize-none"
                                    placeholder="Street address, landmark, etc."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="label-required">City</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        onBlur={() => handleInputBlur('city', formData.city)}
                                        className="input-field"
                                        placeholder="e.g. New Delhi"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label-required">State</label>
                                    <SearchableSelect
                                        value={formData.state}
                                        onChange={(value) => setFormData({ ...formData, state: value })}
                                        options={INDIAN_STATES}
                                        placeholder="Select State"
                                    />
                                </div>
                                <div>
                                    <label className="label-required">Pincode</label>
                                    <input
                                        type="text"
                                        value={formData.pincode}
                                        onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                        onBlur={() => handleInputBlur('pincode', formData.pincode)}
                                        className="input-field"
                                        placeholder="e.g. 110001"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label mb-2">Map Location (Pinpoint the school)</label>
                                <div className="h-72 rounded-lg overflow-hidden border border-gray-300 shadow-inner">
                                    <LocationPicker
                                        latitude={formData.latitude}
                                        longitude={formData.longitude}
                                        onLocationSelect={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                                        onAddressSelect={handleAddressSelect}
                                    />
                                </div>
                                {formData.latitude && (
                                    <div className="flex gap-4 mt-2 text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded inline-flex">
                                        <span>Latitude: {formData.latitude.toFixed(6)}</span>
                                        <span>Longitude: {formData.longitude?.toFixed(6)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Infrastructure Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <FiLayout className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Infrastructure & Details</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="label">Total Student Capacity</label>
                                    <input
                                        type="number"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. 2000"
                                    />
                                </div>
                                <div>
                                    <label className="label">Total Teachers</label>
                                    <input
                                        type="number"
                                        value={formData.teacher_count}
                                        onChange={e => setFormData({ ...formData, teacher_count: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. 50"
                                    />
                                </div>
                                <div>
                                    <label className="label">Total Support Staff</label>
                                    <input
                                        type="number"
                                        value={formData.staff_count}
                                        onChange={e => setFormData({ ...formData, staff_count: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g. 20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label mb-3 block">Facilities Available</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {['Transport', 'Hostel', 'Library', 'Sports Ground', 'Science Lab', 'Computer Lab', 'Cafeteria', 'Auditorium', 'Smart Classes'].map(facility => (
                                        <label key={facility} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.facilities.includes(facility)
                                            ? 'bg-primary-50 border-primary-200 text-primary-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                checked={formData.facilities.includes(facility)}
                                                onChange={() => toggleFacility(facility)}
                                                className="rounded text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm font-medium">{facility}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Admin & Contact (1/3 width) */}
                <div className="space-y-6">

                    {/* Admin Credentials Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-primary-500">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                <FiUser className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Admin Credentials</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label-required">Admin Name</label>
                                <input
                                    type="text"
                                    value={formData.admin_name}
                                    onChange={e => setFormData({ ...formData, admin_name: e.target.value })}
                                    className="input-field"
                                    placeholder="Administrator Name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label-required">Admin Email (Login ID)</label>
                                <input
                                    type="email"
                                    value={formData.admin_email}
                                    onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
                                    className="input-field"
                                    placeholder="admin@school.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label-required">Password</label>
                                <input
                                    type="password"
                                    value={formData.admin_password}
                                    onChange={e => setFormData({ ...formData, admin_password: e.target.value })}
                                    className="input-field"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Admin Phone</label>
                                <input
                                    type="tel"
                                    value={formData.admin_phone}
                                    onChange={e => setFormData({ ...formData, admin_phone: e.target.value })}
                                    className="input-field"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Principal Details Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <FiUserCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Principal Details</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Principal Name</label>
                                <input
                                    type="text"
                                    value={formData.principal_name}
                                    onChange={e => setFormData({ ...formData, principal_name: e.target.value })}
                                    className="input-field"
                                    placeholder="Dr. ..."
                                />
                            </div>
                            <div>
                                <label className="label">Principal Email</label>
                                <input
                                    type="email"
                                    value={formData.principal_email}
                                    onChange={e => setFormData({ ...formData, principal_email: e.target.value })}
                                    className="input-field"
                                    placeholder="principal@..."
                                />
                            </div>
                            <div>
                                <label className="label">Principal Phone</label>
                                <input
                                    type="tel"
                                    value={formData.principal_phone}
                                    onChange={e => setFormData({ ...formData, principal_phone: e.target.value })}
                                    className="input-field"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                    </div>


                </div>
            </form>
        </div>
    )
}
