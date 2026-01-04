import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffAPI, accountsAPI, schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiX } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'

export default function Staff() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingStaff, setEditingStaff] = useState<any>(null)

    const { data: staffData, isLoading } = useQuery({
        queryKey: ['staff', search, roleFilter],
        queryFn: () => staffAPI.list({ search, role: roleFilter }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => staffAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success('Staff member deleted')
        },
    })

    const staff = staffData?.data?.results || staffData?.data || []

    const roleColors: Record<string, string> = {
        school_admin: 'bg-purple-100 text-purple-700',
        office_staff: 'bg-blue-100 text-blue-700',
        conductor: 'bg-green-100 text-green-700',
        driver: 'bg-orange-100 text-orange-700',
        accountant: 'bg-indigo-100 text-indigo-700',
        librarian: 'bg-yellow-100 text-yellow-700',
        nurse: 'bg-pink-100 text-pink-700',
        security: 'bg-gray-100 text-gray-700',
        helper: 'bg-teal-100 text-teal-700',
        teacher: 'bg-amber-100 text-amber-700',
        principal: 'bg-rose-100 text-rose-700',
        vice_principal: 'bg-rose-50 text-rose-600',
        head_master: 'bg-fuchsia-100 text-fuchsia-700',
        supervisor: 'bg-cyan-100 text-cyan-700',
        lab_assistant: 'bg-lime-100 text-lime-700',
        coach: 'bg-emerald-100 text-emerald-700',
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search staff..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                >
                    <option value="">All Roles</option>
                    <option value="school_admin">School Admin</option>
                    <option value="office_staff">Office Staff</option>
                    <option value="conductor">Conductor</option>
                    <option value="driver">Driver</option>
                    <option value="teacher">Teacher</option>
                    <option value="accountant">Accountant</option>
                    <option value="librarian">Librarian</option>
                    <option value="nurse">Nurse</option>
                    <option value="security">Security</option>
                    <option value="helper">Helper</option>
                    <option value="principal">Principal</option>
                    <option value="vice_principal">Vice Principal</option>
                    <option value="head_master">Head Master</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="lab_assistant">Lab Assistant</option>
                    <option value="coach">Coach</option>
                </select>
                <button
                    onClick={() => {
                        setEditingStaff(null)
                        setShowModal(true)
                    }}
                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <FiPlus className="mr-2" />
                    Add Staff
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : staff.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {staff.map((member: any) => (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                    <span className="text-primary-600 font-semibold">
                                                        {member.first_name?.[0]}{member.last_name?.[0]}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{member.phone}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{member.email || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColors[member.role] || 'bg-gray-100'}`}>
                                                {member.role?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {member.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* Hide actions for School Admins? Or let them manage? */}
                                            {/* Assuming they can manage their own staff */}
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => {
                                                    setEditingStaff(member)
                                                    setShowModal(true)
                                                }} className="p-2 text-gray-500 hover:text-blue-500"><FiEdit /></button>
                                                <button onClick={() => deleteMutation.mutate(member.id)} className="p-2 text-gray-500 hover:text-red-500"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">No staff members found</div>
                )}
            </div>

            {/* Staff Modal */}
            {showModal && (
                <StaffModal
                    onClose={() => setShowModal(false)}
                    initialData={editingStaff}
                    userRole={user?.role}
                />
            )}
        </div>
    )
}

function StaffModal({ onClose, initialData, userRole }: { onClose: () => void; initialData?: any; userRole?: string }) {
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
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        role: initialData?.role || 'conductor',
        password: '',
        school_id: initialData?.school?.id || initialData?.school_id || '',
    })

    // Auto-select first school for school admin when userSchools loads
    useEffect(() => {
        if (!isEditing && !formData.school_id && userSchools.length > 0) {
            // school might be an object or an ID depending on serializer, handle both safely
            const school = userSchools[0].school
            const schoolId = typeof school === 'object' ? school.id : school
            setFormData(prev => ({ ...prev, school_id: schoolId }))
        }
    }, [userSchools, isEditing, formData.school_id])

    const mutation = useMutation({
        mutationFn: (data: any) => {
            if (isEditing) {
                return staffAPI.update(initialData.id, data)
            }
            return staffAPI.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success(isEditing ? 'Staff updated' : 'Staff created')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save staff')
            // Show validation errors
            if (error.response?.data) {
                Object.entries(error.response.data).forEach(([key, value]) => {
                    if (key !== 'message') toast.error(`${key}: ${value}`)
                })
            }
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const data = { ...formData }
        // If school admin, ensure school_id is set if not already (redundant check but safe)
        if (userRole !== 'root_admin' && !data.school_id && userSchools.length > 0) {
            const school = userSchools[0].school
            data.school_id = typeof school === 'object' ? school.id : school
        }

        if (!data.school_id) {
            toast.error('Please select a school')
            return
        }

        mutation.mutate(data)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {isEditing ? 'Edit Staff' : 'Add Staff'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            <option value="conductor">Conductor</option>
                            <option value="driver">Driver</option>
                            <option value="office_staff">Office Staff</option>
                            <option value="teacher">Teacher</option>
                            <option value="accountant">Accountant</option>
                            <option value="librarian">Librarian</option>
                            <option value="nurse">Nurse</option>
                            <option value="security">Security</option>
                            <option value="helper">Helper</option>
                            <option value="principal">Principal</option>
                            <option value="vice_principal">Vice Principal</option>
                            <option value="head_master">Head Master</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="lab_assistant">Lab Assistant</option>
                            <option value="coach">Coach</option>
                            {(userRole === 'root_admin' || (isEditing && formData.role === 'school_admin')) && <option value="school_admin">School Admin</option>}
                        </select>
                    </div>

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

                    {!isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                required={!isEditing}
                                minLength={8}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    )}

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
                            {mutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Staff'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
