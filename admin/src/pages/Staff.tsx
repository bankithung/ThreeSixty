import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffAPI, accountsAPI, schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiX, FiArrowLeft, FiUsers, FiUserCheck, FiUserPlus, FiBriefcase } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'
import StatCard from '../components/StatCard'
import Select from '../components/ui/Select'

export default function Staff() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const schoolId = searchParams.get('school')
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('active')
    const [showModal, setShowModal] = useState(false)
    const [editingStaff, setEditingStaff] = useState<any>(null)

    const { data: staffData, isLoading } = useQuery({
        queryKey: ['staff', search, roleFilter, schoolId, statusFilter],
        queryFn: () => staffAPI.list({
            search,
            role: roleFilter,
            school_id: schoolId,
            is_active: statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 'true' : 'false')
        }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => staffAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success('Staff member deleted')
        },
    })

    const staff = staffData?.data?.results || staffData?.data || []
    const totalCount = staffData?.data?.count || staff.length

    // Calculate quick stats (Client-side for now as API might not provide aggregated stats here yet)
    // In a real app, use `schoolsAPI.getStats(schoolId)` if available
    const activeStaff = staff.filter((m: any) => m.is_active).length
    const adminCount = staff.filter((m: any) => m.role === 'school_admin').length

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

    const ROLES = [
        { id: '', name: 'All Roles' },
        { id: 'school_admin', name: 'School Admin' },
        { id: 'teacher', name: 'Teacher' },
        { id: 'driver', name: 'Driver' },
        { id: 'conductor', name: 'Conductor' },
        { id: 'office_staff', name: 'Office Staff' },
        { id: 'principal', name: 'Principal' },
        { id: 'accountant', name: 'Accountant' },
        { id: 'security', name: 'Security' },
    ]

    const STATUS_OPTIONS = [
        { id: 'active', name: 'Active' },
        { id: 'inactive', name: 'Inactive' },
        { id: 'all', name: 'All Status' }
    ]

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            {/* Top Navigation */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
            >
                <FiArrowLeft className="mr-2" /> Back
            </button>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Staff" value={totalCount} icon={FiUsers} color="blue" />
                <StatCard label="Active Staff" value={activeStaff} icon={FiUserCheck} color="green" />
                <StatCard label="Admins" value={adminCount} icon={FiBriefcase} color="purple" />
                <StatCard label="New This Month" value={'2'} subtext="Demo Data" icon={FiUserPlus} color="teal" />
            </div>

            {/* Toolbar (Filters & Actions) */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                {/* Search & Filters Group */}
                <div className="flex flex-col md:flex-row gap-3 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 w-full md:max-w-xs">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-sm text-gray-900 placeholder-gray-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="w-full md:w-48">
                        <Select
                            value={roleFilter}
                            onChange={(val) => setRoleFilter(val)}
                            options={ROLES}
                            placeholder="All Roles"
                        />
                    </div>

                    <div className="w-full md:w-40">
                        <Select
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val)}
                            options={STATUS_OPTIONS}
                            placeholder="Status"
                        />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex gap-3 border-t md:border-t-0 pt-4 md:pt-0">
                    <button
                        onClick={() => {
                            setEditingStaff(null)
                            setShowModal(true)
                        }}
                        className="btn-primary whitespace-nowrap text-sm flex items-center"
                    >
                        <FiPlus className="mr-2" /> Add Staff
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                    </div>
                ) : staff.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Phone</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {staff.map((member: any) => (
                                    <tr key={member.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 shadow-sm text-gray-600 font-bold text-sm">
                                                    {member.first_name?.[0]}{member.last_name?.[0]}
                                                </div>
                                                <div className="font-semibold text-gray-900">{member.full_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{member.phone}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{member.email || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border border-opacity-50 ${roleColors[member.role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                {member.role?.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${member.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {member.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingStaff(member); setShowModal(true) }}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <FiEdit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteMutation.mutate(member.id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FiSearch className="text-gray-400 w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No staff members found</h3>
                        <p className="text-gray-500 mt-1 max-w-sm">Try adjusting your filters or add a new staff member.</p>
                        <button
                            onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('active') }}
                            className="mt-6 text-primary-600 font-medium hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
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
            </div >
        </div >
    )
}
