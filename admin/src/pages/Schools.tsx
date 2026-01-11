import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { schoolsAPI } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye } from 'react-icons/fi'
import LocationPicker from '../components/LocationPicker'
import SearchableSelect from '../components/SearchableSelect'

const INDIAN_STATES = [
    'Andaman and Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Ladakh',
    'Lakshadweep',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Puducherry',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
]

export default function Schools() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingSchool, setEditingSchool] = useState<any>(null)

    const { data: schoolsData, isLoading } = useQuery({
        queryKey: ['schools', search],
        queryFn: () => schoolsAPI.list({ search }),
    })

    const createMutation = useMutation({
        mutationFn: (data: any) => schoolsAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success('School created successfully')
            setShowModal(false)
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to create school')
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => schoolsAPI.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success('School updated successfully')
            setShowModal(false)
        },
        onError: (error: any) => {
            console.error('Update failed:', error.response?.data)
            const errorMsg = error.response?.data?.detail || JSON.stringify(error.response?.data) || 'Failed to update school'
            toast.error(errorMsg)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => schoolsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success('School deleted')
        },
        onError: () => {
            toast.error('Failed to delete school')
        },
    })

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Delete ${name}? This cannot be undone.`)) {
            deleteMutation.mutate(id)
        }
    }

    const schools = schoolsData?.data?.results || schoolsData?.data || []

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search schools..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                </div>
                {user?.role === 'root_admin' && (
                    <button
                        onClick={() => {
                            setEditingSchool(null)
                            setShowModal(true)
                        }}
                        className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                        <FiPlus className="mr-2" />
                        Add School
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : schools.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        School
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Code
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {schools.map((school: any) => (
                                    <tr key={school.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-primary-600 font-semibold text-sm">
                                                        {school.name?.[0]}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {school.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {school.code}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {school.city}, {school.state}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {school.phone}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${school.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {school.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link
                                                    to={`/schools/${school.id}`}
                                                    className="p-2 text-gray-500 hover:text-primary-500"
                                                    title="View"
                                                >
                                                    <FiEye />
                                                </Link>
                                                {user?.role === 'root_admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditingSchool(school)
                                                                setShowModal(true)
                                                            }}
                                                            className="p-2 text-gray-500 hover:text-blue-500"
                                                            title="Edit"
                                                        >
                                                            <FiEdit />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(school.id, school.name)}
                                                            className="p-2 text-gray-500 hover:text-red-500"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        No schools found
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <SchoolModal
                    school={editingSchool}
                    onClose={() => setShowModal(false)}
                    onSave={(data) => {
                        const payload = { ...data }

                        // Ensure lat/lng are numbers or null
                        // Check specifically for empty string or undefined/null
                        if (payload.latitude === '' || payload.latitude === undefined || payload.latitude === null) {
                            payload.latitude = null
                        } else {
                            payload.latitude = Number(payload.latitude)
                        }

                        if (payload.longitude === '' || payload.longitude === undefined || payload.longitude === null) {
                            payload.longitude = null
                        } else {
                            payload.longitude = Number(payload.longitude)
                        }

                        if (editingSchool) {
                            // Remove admin fields for update
                            const { admin_name, admin_email, admin_phone, admin_password, ...updateData } = payload
                            updateMutation.mutate({ id: editingSchool.id, data: updateData })
                        } else {
                            createMutation.mutate(payload)
                        }
                    }}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                />
            )}
        </div>
    )
}

function SchoolModal({
    school,
    onClose,
    onSave,
    isLoading,
}: {
    school: any
    onClose: () => void
    onSave: (data: any) => void
    isLoading: boolean
}) {
    const [formData, setFormData] = useState({
        name: school?.name || '',
        code: school?.code || '',
        address: school?.address || '',
        city: school?.city || '',
        state: school?.state || '',
        country: school?.country || 'India',
        phone: school?.phone || '',
        email: school?.email || '',
        pincode: school?.pincode || '',
        latitude: school?.latitude || undefined,
        longitude: school?.longitude || undefined,
        admin_name: '',
        admin_email: '',
        admin_phone: '',
        admin_password: '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.state) {
            toast.error('State is required')
            return
        }
        if (!formData.city) {
            toast.error('City is required')
            return
        }
        if (!formData.pincode) {
            toast.error('Pincode is required')
            return
        }

        onSave(formData)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">
                        {school ? 'Edit School' : 'Add New School'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                School Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                School Code
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                City
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                State
                            </label>
                            <SearchableSelect
                                value={formData.state}
                                onChange={(value) => setFormData({ ...formData, state: value })}
                                options={INDIAN_STATES}
                                placeholder="Select State"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pincode
                            </label>
                            <input
                                type="text"
                                value={formData.pincode}
                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                required
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                School Location
                            </label>
                            <LocationPicker
                                latitude={formData.latitude}
                                longitude={formData.longitude}
                                onLocationSelect={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                            />
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <input
                                    type="text"
                                    placeholder="Latitude"
                                    value={formData.latitude || ''}
                                    readOnly
                                    className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Longitude"
                                    value={formData.longitude || ''}
                                    readOnly
                                    className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Admin Details Section - Only show for new schools */}
                    {!school && (
                        <div className="border-t pt-4 mt-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">School Admin Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.admin_name}
                                        onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.admin_email}
                                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.admin_phone}
                                        onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admin Password
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.admin_password}
                                        onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
