import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { schoolsAPI } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiAlertTriangle, FiGrid, FiList, FiMapPin, FiPhone, FiCheckCircle, FiXCircle, FiUserCheck, FiUsers } from 'react-icons/fi'
import Select from '../components/ui/Select'
import StatCard from '../components/StatCard'
import EditSchoolModal from '../components/EditSchoolModal'

const INDIAN_STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
    'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

import ConfirmationModal from '../components/ConfirmationModal'

export default function Schools() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // Filters
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [stateFilter, setStateFilter] = useState('')
    const [cityFilter, setCityFilter] = useState('')
    const [planFilter, setPlanFilter] = useState('')
    const [sizeFilter, setSizeFilter] = useState('')
    const [sortBy, setSortBy] = useState('newest')

    // Modal State
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingSchool, setEditingSchool] = useState<any>(null)

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'block' | 'unblock';
        id: string;
        name: string;
    }>({ isOpen: false, type: 'block', id: '', name: '' });

    const { data: schoolsData, isLoading } = useQuery({
        queryKey: ['schools', search],
        queryFn: () => schoolsAPI.list({ search }),
        refetchOnMount: 'always',
        refetchOnWindowFocus: true
    })

    const schools = schoolsData?.data?.results || schoolsData?.data || []

    // Derived Data for Filters
    const uniqueCities = Array.from(new Set(schools.map((s: any) => s.city).filter(Boolean))).sort() as string[]
    const uniquePlans = Array.from(new Set(schools.map((s: any) => s.pricing_plan).filter(Boolean))).sort() as string[]

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Filter Logic
    const filteredSchools = schools.filter((school: any) => {
        const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase()) ||
            school.city.toLowerCase().includes(search.toLowerCase()) ||
            school.code?.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? school.is_active : !school.is_active)
        const matchesState = stateFilter === '' || school.state === stateFilter
        const matchesCity = cityFilter === '' || school.city === cityFilter
        const matchesPlan = planFilter === '' || school.pricing_plan === planFilter

        // Size Filter (mock logic assuming size usually refers to student count)
        let matchesSize = true
        if (sizeFilter === 'small') matchesSize = (school.student_count || 0) < 100
        if (sizeFilter === 'medium') matchesSize = (school.student_count || 0) >= 100 && (school.student_count || 0) < 500
        if (sizeFilter === 'large') matchesSize = (school.student_count || 0) >= 500

        return matchesSearch && matchesStatus && matchesState && matchesCity && matchesPlan && matchesSize
    })
        .sort((a: any, b: any) => {
            switch (sortBy) {
                case 'name_asc':
                    return a.name.localeCompare(b.name)
                case 'name_desc':
                    return b.name.localeCompare(a.name)
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                case 'size_desc':
                    return (b.student_count || 0) - (a.student_count || 0)
                case 'size_asc':
                    return (a.student_count || 0) - (b.student_count || 0)
                default:
                    return 0
            }
        })

    // Pagination Logic
    const totalPages = Math.ceil(filteredSchools.length / itemsPerPage)
    const paginatedSchools = filteredSchools.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
        }
    }

    const schoolsToDisplay = paginatedSchools

    // Existing Mutation Logic...
    const deleteMutation = useMutation({
        mutationFn: (id: string) => schoolsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success('School deleted')
            closeConfirmModal()
        },
        onError: () => {
            toast.error('Failed to delete school')
            closeConfirmModal()
        },
    })


    const blockMutation = useMutation({
        mutationFn: ({ id, action }: { id: string; action: 'block' | 'unblock' }) => schoolsAPI.block(id, action),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success(data.data.message || 'School status updated')
            closeConfirmModal()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update school status')
            closeConfirmModal()
        }
    })

    const closeConfirmModal = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
    }

    const handleDelete = (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'delete',
            id,
            name
        })
    }

    const handleBlock = (id: string, name: string, isActive: boolean) => {
        setConfirmModal({
            isOpen: true,
            type: isActive ? 'block' : 'unblock',
            id,
            name
        })
    }

    const handleConfirmAction = () => {
        const { type, id } = confirmModal
        if (type === 'delete') {
            deleteMutation.mutate(id)
        } else {
            blockMutation.mutate({ id, action: type })
        }
    }



    const hasActiveFilters = search || statusFilter !== 'all' || stateFilter || cityFilter || planFilter || sizeFilter || sortBy !== 'newest'

    const clearFilters = () => {
        setSearch('')
        setStatusFilter('all')
        setStateFilter('')
        setCityFilter('')
        setPlanFilter('')
        setSizeFilter('')
        setSortBy('newest')
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Filters & Search Toolbar - Title Removed, Button Added Here */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                {/* Search & Add Button Row */}
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search schools by name, city, or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500"
                        />
                    </div>
                    {user?.role === 'root_admin' && (
                        <Link
                            to="/schools/new"
                            className="btn-primary flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap"
                        >
                            <FiPlus className="w-5 h-5" />
                            <span>Add New School</span>
                        </Link>
                    )}
                </div>

                {/* Filters Row */}
                < div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" >
                    <Select
                        value={stateFilter}
                        onChange={(val) => {
                            setStateFilter(val)
                            setCityFilter('')
                        }}
                        options={[{ id: '', name: 'All States' }, ...INDIAN_STATES.map(s => ({ id: s, name: s }))]}
                        placeholder="State"
                        className="w-full"
                    />

                    <Select
                        value={cityFilter}
                        onChange={setCityFilter}
                        options={[
                            { id: '', name: 'All Cities' },
                            ...uniqueCities.map(c => ({ id: c, name: c }))
                        ]}
                        placeholder="City"
                        className="w-full"
                    />

                    <Select
                        value={planFilter}
                        onChange={setPlanFilter}
                        options={[
                            { id: '', name: 'All Plans' },
                            ...uniquePlans.map(p => ({ id: p, name: p.charAt(0).toUpperCase() + p.slice(1) }))
                        ]}
                        placeholder="Plan"
                        className="w-full"
                    />

                    <Select
                        value={sizeFilter}
                        onChange={setSizeFilter}
                        options={[
                            { id: '', name: 'Any Size' },
                            { id: 'small', name: 'Small (<100)' },
                            { id: 'medium', name: 'Medium (100-500)' },
                            { id: 'large', name: 'Large (>500)' },
                        ]}
                        placeholder="Size"
                        className="w-full"
                    />

                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { id: 'all', name: 'All Status' },
                            { id: 'active', name: 'Active' },
                            { id: 'inactive', name: 'Inactive' }
                        ]}
                        placeholder="Status"
                        className="w-full"
                    />

                    <Select
                        value={sortBy}
                        onChange={setSortBy}
                        options={[
                            { id: 'newest', name: 'Newest First' },
                            { id: 'oldest', name: 'Oldest First' },
                            { id: 'size_desc', name: 'Largest First' },
                            { id: 'size_asc', name: 'Smallest First' },
                            { id: 'name_asc', name: 'Name (A-Z)' },
                            { id: 'name_desc', name: 'Name (Z-A)' },
                        ]}
                        placeholder="Sort By"
                        className="w-full"
                    />
                </div >

                {/* Active Filters Summary / Clear Button */}
                {
                    hasActiveFilters && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500 font-medium">
                                Found {filteredSchools.length} {filteredSchools.length === 1 ? 'school' : 'schools'}
                            </span>
                            <button
                                onClick={clearFilters}
                                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1.5 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                            >
                                <FiXCircle className="w-3.5 h-3.5" />
                                Clear Filters
                            </button>
                        </div>
                    )
                }
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Schools"
                    value={schools.length}
                    icon={FiGrid}
                    color="blue"
                />
                <StatCard
                    label="Active Schools"
                    value={schools.filter((s: any) => s.is_active).length}
                    icon={FiCheckCircle}
                    color="green"
                />
                <StatCard
                    label="Inactive / Blocked"
                    value={schools.filter((s: any) => !s.is_active).length}
                    icon={FiXCircle}
                    color="red"
                />
                <StatCard
                    label="States Covered"
                    value={new Set(schools.map((s: any) => s.state).filter(Boolean)).size}
                    icon={FiMapPin}
                    color="orange"
                />
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {
                    isLoading ? (
                        <div className="flex items-center justify-center py-20" >
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                        </div>
                    ) : filteredSchools.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                        <th className="px-6 py-4">School</th>
                                        <th className="px-6 py-4">Plan</th>
                                        <th className="px-6 py-4">Stats</th>
                                        <th className="px-6 py-4">Location</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {schoolsToDisplay.map((school: any) => (
                                        <tr key={school.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    {school.logo ? (
                                                        <img
                                                            src={school.logo}
                                                            alt={school.name}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center font-bold text-lg">
                                                            {school.name?.[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{school.name}</div>
                                                        <div className="text-xs text-gray-500">{school.city}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 capitalize border border-indigo-100">
                                                    {school.pricing_plan || 'Standard'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                        <FiUsers className="w-3.5 h-3.5 text-gray-400" />
                                                        {school.student_count || 0} Students
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <FiUserCheck className="w-3.5 h-3.5 text-gray-400" />
                                                        {school.staff_count || 0} Staff
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-700 flex items-center gap-2">
                                                    <FiMapPin className="text-gray-400 w-3.5 h-3.5" />
                                                    {school.city}, {school.state}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1 pl-5.5">{school.phone || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${school.is_active
                                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                                    : 'bg-red-50 text-red-700 border border-red-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${school.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    {school.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ActionBtn
                                                        onClick={() => navigate(`/schools/${school.id}`)}
                                                        icon={FiEye}
                                                        tooltip="View Details"
                                                    />
                                                    {user?.role === 'root_admin' && (
                                                        <>
                                                            <ActionBtn
                                                                onClick={() => {
                                                                    setEditingSchool(school)
                                                                    setShowEditModal(true)
                                                                }}
                                                                icon={FiEdit}
                                                                tooltip="Edit"
                                                            />
                                                            <ActionBtn
                                                                onClick={() => handleBlock(school.id, school.name, school.is_active)}
                                                                icon={FiAlertTriangle}
                                                                color={school.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}
                                                                tooltip={school.is_active ? 'Block' : 'Unblock'}
                                                            />
                                                            <ActionBtn
                                                                onClick={() => handleDelete(school.id, school.name)}
                                                                icon={FiTrash2}
                                                                color="text-red-600 hover:bg-red-50"
                                                                tooltip="Delete"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Pagination Controls */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                                <div className="text-sm text-gray-500">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredSchools.length)}</span> of <span className="font-medium">{filteredSchools.length}</span> results
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiSearch className="text-gray-400 w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">No schools found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your filters or add a new school.</p>
                        </div>
                    )
                }
            </div >

            {/* Edit Modal (Kept for quick edits) */}
            {
                showEditModal && editingSchool && (
                    <EditSchoolModal
                        isOpen={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        school={editingSchool}
                    />
                )
            }

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={handleConfirmAction}
                title={
                    confirmModal.type === 'delete' ? 'Delete School'
                        : confirmModal.type === 'block' ? 'Block School'
                            : 'Unblock School'
                }
                message={
                    confirmModal.type === 'delete'
                        ? `Are you sure you want to delete ${confirmModal.name}? This action cannot be undone.`
                        : confirmModal.type === 'block'
                            ? `Are you sure you want to block ${confirmModal.name}? This will prevent all access for this school.`
                            : `Are you sure you want to unblock ${confirmModal.name}? Access will be restored.`
                }
                confirmLabel={
                    confirmModal.type === 'delete' ? 'Delete'
                        : confirmModal.type === 'block' ? 'Block'
                            : 'Unblock'
                }
                variant={confirmModal.type === 'unblock' ? 'info' : 'danger'}
                isLoading={deleteMutation.isPending || blockMutation.isPending}
            />
        </div >
    )
}

function ActionBtn({ onClick, icon: Icon, color = "text-gray-500 hover:text-gray-900 hover:bg-gray-100", tooltip }: any) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className={`p-2 rounded-lg transition-colors ${color}`}
            title={tooltip}
        >
            <Icon className="w-4 h-4" />
        </button>
    )
}
