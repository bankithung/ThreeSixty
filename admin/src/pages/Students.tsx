import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI, schoolsAPI, routesAPI } from '../lib/api'
import toast from 'react-hot-toast'
import {
    FiPlus, FiSearch, FiEdit, FiTrash2, FiCamera,
    FiEye, FiArrowLeft, FiDownload,
    FiAlertCircle, FiUser, FiMapPin, FiCheckCircle
} from 'react-icons/fi'
import StudentFormModal from '../components/StudentFormModal'
import Select from '../components/ui/Select'
import StatCard from '../components/StatCard'

export default function Students() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const activeSchoolId = searchParams.get('school')
    const queryClient = useQueryClient()

    // Filters
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [selectedGrade, setSelectedGrade] = useState('')
    const [selectedRoute, setSelectedRoute] = useState('')
    const [statusFilter, setStatusFilter] = useState('active')

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [editingStudent, setEditingStudent] = useState<any>(null)

    // 1. Fetch Students
    const { data: studentsData, isLoading, refetch } = useQuery({
        queryKey: ['students', search, page, activeSchoolId, selectedGrade, selectedRoute, statusFilter],
        queryFn: () => studentsAPI.list({
            search,
            page,
            school_id: activeSchoolId,
            grade: selectedGrade || undefined,
            route_id: selectedRoute || undefined,
            is_active: statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 'true' : 'false')
        }),
    })

    // 2. Fetch Routes for Filter
    const { data: routesData } = useQuery({
        queryKey: ['routes', activeSchoolId],
        queryFn: () => routesAPI.list({ school_id: activeSchoolId }),
        enabled: !!activeSchoolId
    })

    // 3. Fetch Stats (Optional: If school is selected)
    const { data: statsData } = useQuery({
        queryKey: ['schoolStats', activeSchoolId],
        queryFn: () => schoolsAPI.getStats(activeSchoolId!),
        enabled: !!activeSchoolId
    })

    const students = studentsData?.data?.results || studentsData?.data || []
    const totalCount = studentsData?.data?.count || 0
    const totalPages = Math.ceil(totalCount / 20)
    const routes = routesData?.data?.results || routesData?.data || []
    const stats = statsData?.data

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => studentsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            toast.success('Student deleted')
        },
        onError: () => toast.error('Failed to delete student'),
    })

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Delete ${name}? This cannot be undone.`)) {
            deleteMutation.mutate(id)
        }
    }

    // Common Grades List
    const GRADES_LIST = ['Pre-KG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

    // Format options for Select component
    const gradeOptions = [
        { id: '', name: 'All Grades' },
        ...GRADES_LIST.map(g => ({ id: g, name: g }))
    ]

    const routeOptions = [
        { id: '', name: 'All Routes' },
        ...routes.map((r: any) => ({ id: r.id, name: r.name }))
    ]

    const statusOptions = [
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
            {activeSchoolId && stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Students" value={stats.total_students} icon={FiUser} color="blue" />
                    <StatCard label="Active Routes" value={stats.total_routes} icon={FiMapPin} color="orange" />
                    <StatCard label="Face Data Set" value={stats.students_with_face_data || 0} subtext="Registered" icon={FiCamera} color="green" />
                    <StatCard label="Pending Data" value={stats.students_without_face_data || 0} subtext="No Face Data" icon={FiAlertCircle} color="red" />
                </div>
            )}

            {/* Toolbar (Filters & Actions) */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                {/* Search & Filters Group */}
                <div className="flex flex-col md:flex-row gap-3 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 w-full md:max-w-xs">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-sm text-gray-900 placeholder-gray-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="w-full md:w-32">
                        <Select
                            value={selectedGrade}
                            onChange={setSelectedGrade}
                            options={gradeOptions}
                            placeholder="Grade"
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <Select
                            value={selectedRoute}
                            onChange={setSelectedRoute}
                            options={routeOptions}
                            placeholder="Route"
                        />
                    </div>

                    <div className="w-full md:w-32">
                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={statusOptions}
                            placeholder="Status"
                        />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex gap-3 border-t md:border-t-0 pt-4 md:pt-0">
                    <button className="btn-white whitespace-nowrap text-sm">
                        <FiDownload className="mr-2" /> Export
                    </button>
                    <button
                        onClick={() => navigate('/students/new')}
                        className="btn-primary whitespace-nowrap text-sm"
                    >
                        <FiPlus className="mr-2" /> Add Student
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                    </div>
                ) : students.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">ID / Grade</th>
                                        <th className="px-6 py-4">Transport Route</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.map((student: any) => (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                                                        {student.photo ? (
                                                            <img src={student.photo} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-gray-600 font-bold text-sm">
                                                                {student.first_name?.[0]}{student.last_name?.[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{student.full_name}</div>
                                                        <div className="text-xs text-gray-500">{student.gender || 'Unknown'} • {student.age ? `${student.age} yrs` : '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded w-fit mb-1">
                                                        {student.admission_number}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Class {student.grade} {student.section && `(${student.section})`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.route_name ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                                            <FiMapPin className="w-3.5 h-3.5" />
                                                        </div>
                                                        {student.route_name}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">Not assigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {/* Active Status */}
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${student.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${student.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        {student.is_active ? 'Active' : 'Inactive'}
                                                    </span>

                                                    {/* Face Data Status */}
                                                    {student.face_encoding_count > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500" title="Face Data Registered">
                                                            <FiCheckCircle className="text-green-500 w-3.5 h-3.5" /> Biometrics Set
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-400" title="No Face Data">
                                                            <FiAlertCircle className="w-3.5 h-3.5" /> No Biometrics
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ActionBtn onClick={() => navigate(`/students/${student.id}`)} icon={FiEye} tooltip="View Profile" />
                                                    <ActionBtn onClick={() => { setEditingStudent(student); setShowModal(true) }} icon={FiEdit} tooltip="Edit" />
                                                    <ActionBtn onClick={() => handleDelete(student.id, student.full_name)} icon={FiTrash2} color="text-red-600 hover:bg-red-50" tooltip="Delete" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                                <span className="text-sm text-gray-500">
                                    Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => p - 1)}
                                        disabled={page === 1}
                                        className="btn-white text-sm px-3 py-1.5"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page === totalPages}
                                        className="btn-white text-sm px-3 py-1.5"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FiSearch className="text-gray-400 w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No students found</h3>
                        <p className="text-gray-500 mt-1 max-w-sm">
                            We couldn't find any students matching your filters. Try adjusting your search criteria or add a new student.
                        </p>
                        <button
                            onClick={() => {
                                setSearch(''); setSelectedGrade(''); setSelectedRoute(''); setStatusFilter('active');
                            }}
                            className="mt-6 text-primary-600 font-medium hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            <StudentFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                student={editingStudent}
                onSuccess={() => refetch()}
            />
        </div>
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

