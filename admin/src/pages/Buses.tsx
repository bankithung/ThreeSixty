import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { busesAPI, staffAPI, accountsAPI, schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiTruck, FiX } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'

export default function Buses() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingBus, setEditingBus] = useState<any>(null)

    const { data: busesData, isLoading } = useQuery({
        queryKey: ['buses', search],
        queryFn: () => busesAPI.list({ search }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => busesAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buses'] })
            toast.success('Bus deleted')
        },
    })

    const buses = busesData?.data?.results || busesData?.data || []

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search buses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <button
                    onClick={() => {
                        setEditingBus(null)
                        setShowModal(true)
                    }}
                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <FiPlus className="mr-2" />
                    Add Bus
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
            ) : buses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {buses.map((bus: any) => (
                        <div key={bus.id} className="bg-white rounded-xl shadow-sm p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <FiTruck className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Bus {bus.number}</h3>
                                        <p className="text-sm text-gray-500">{bus.registration_number}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bus.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {bus.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Capacity</span>
                                    <span className="font-medium">{bus.capacity} seats</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Driver</span>
                                    <span className="font-medium">{bus.driver_name || '-'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Conductor</span>
                                    <span className="font-medium">{bus.conductor_name || '-'}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t flex justify-end space-x-2">
                                <button
                                    onClick={() => navigate(`/buses/${bus.id}`)}
                                    className="p-2 text-gray-500 hover:text-blue-500"
                                >
                                    <FiEdit />
                                </button>
                                <button onClick={() => deleteMutation.mutate(bus.id)} className="p-2 text-gray-500 hover:text-red-500"><FiTrash2 /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                    No buses found
                </div>
            )}

            {/* Bus Modal */}
            {showModal && (
                <BusModal
                    onClose={() => setShowModal(false)}
                    initialData={editingBus}
                    userRole={user?.role}
                />
            )}
        </div>
    )
}

function BusModal({ onClose, initialData, userRole }: { onClose: () => void; initialData?: any; userRole?: string }) {
    const queryClient = useQueryClient()
    const isEditing = !!initialData

    // Fetch schools for root admin
    const { data: schoolsData } = useQuery({
        queryKey: ['schools'],
        queryFn: () => schoolsAPI.list(),
        enabled: userRole === 'root_admin',
    })

    // Fetch user's schools for school admin
    const { data: userSchoolsData } = useQuery({
        queryKey: ['userSchools'],
        queryFn: () => accountsAPI.getUserSchools(),
        enabled: userRole !== 'root_admin',
    })

    const schools = schoolsData?.data?.results || schoolsData?.data || []
    const userSchools = userSchoolsData?.data?.results || userSchoolsData?.data || []

    const [formData, setFormData] = useState({
        number: initialData?.number || '',
        registration_number: initialData?.registration_number || '',
        capacity: initialData?.capacity || 30,
        school_id: initialData?.school?.id || initialData?.school_id || '',
        driver_id: initialData?.driver?.id || initialData?.driver_id || '',
        conductor_id: initialData?.conductor?.id || initialData?.conductor_id || '',
    })

    // Fetch staff based on selected school
    const { data: driversData } = useQuery({
        queryKey: ['drivers', formData.school_id],
        queryFn: () => staffAPI.list({ role: 'driver', school_id: formData.school_id }),
        enabled: !!formData.school_id,
    })

    const { data: conductorsData } = useQuery({
        queryKey: ['conductors', formData.school_id],
        queryFn: () => staffAPI.list({ role: 'conductor', school_id: formData.school_id }),
        enabled: !!formData.school_id,
    })

    const drivers = driversData?.data?.results || driversData?.data || []
    const conductors = conductorsData?.data?.results || conductorsData?.data || []

    // Update school_id when userSchools loads
    useEffect(() => {
        if (userRole !== 'root_admin' && userSchools.length > 0 && !formData.school_id) {
            const school = userSchools[0].school
            const schoolId = typeof school === 'object' ? school.id : school
            setFormData(prev => ({ ...prev, school_id: schoolId }))
        }
    }, [userSchools, userRole, formData.school_id])

    const mutation = useMutation({
        mutationFn: (data: any) => {
            if (isEditing) {
                return busesAPI.update(initialData.id, data)
            }
            return busesAPI.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buses'] })
            toast.success(isEditing ? 'Bus updated' : 'Bus created')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save bus')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        mutation.mutate(formData)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {isEditing ? 'Edit Bus' : 'Add Bus'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {userRole === 'root_admin' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                            <select
                                required
                                value={formData.school_id}
                                onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            >
                                <option value="">Select School</option>
                                {schools.map((school: any) => (
                                    <option key={school.id} value={school.id}>{school.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bus Number</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. 01"
                                value={formData.number}
                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registration No</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. KA-01-AB-1234"
                                value={formData.registration_number}
                                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                            <select
                                value={formData.driver_id}
                                onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                disabled={!formData.school_id}
                            >
                                <option value="">Select Driver</option>
                                {drivers.map((driver: any) => (
                                    <option key={driver.user.id} value={driver.user.id}>{driver.user.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conductor</label>
                            <select
                                value={formData.conductor_id}
                                onChange={(e) => setFormData({ ...formData, conductor_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                disabled={!formData.school_id}
                            >
                                <option value="">Select Conductor</option>
                                {conductors.map((conductor: any) => (
                                    <option key={conductor.user.id} value={conductor.user.id}>{conductor.user.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mr-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Bus'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
