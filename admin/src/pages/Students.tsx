import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiCamera, FiEye } from 'react-icons/fi'
import StudentFormModal from '../components/StudentFormModal'

export default function Students() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [showModal, setShowModal] = useState(false)
    const [editingStudent, setEditingStudent] = useState<any>(null)

    const { data: studentsData, isLoading, refetch } = useQuery({
        queryKey: ['students', search, page],
        queryFn: () => studentsAPI.list({ search, page }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => studentsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            refetch() // Force immediate refetch
            toast.success('Student deleted')
        },
        onError: () => {
            toast.error('Failed to delete student')
        },
    })

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Delete ${name}? This cannot be undone.`)) {
            deleteMutation.mutate(id)
        }
    }

    const students = studentsData?.data?.results || studentsData?.data || []
    const totalPages = Math.ceil((studentsData?.data?.count || 0) / 20)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                </div>
                <button
                    onClick={() => {
                        setEditingStudent(null)
                        setShowModal(true)
                    }}
                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                    <FiPlus className="mr-2" />
                    Add Student
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : students.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Student
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Admission No
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Grade
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Route
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Face Data
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {students.map((student: any) => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                                                        {student.photo ? (
                                                            <img src={student.photo} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-primary-600 font-semibold">
                                                                {student.first_name?.[0]}{student.last_name?.[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {student.full_name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.admission_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.grade} {student.section && `- ${student.section}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.route_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.face_encoding_count > 0
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                >
                                                    {student.face_encoding_count > 0 ? 'Registered' : 'Not Set'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => navigate(`/students/${student.id}`)}
                                                        className="p-2 text-gray-500 hover:text-primary-500"
                                                        title="View Details"
                                                    >
                                                        <FiEye />
                                                    </button>
                                                    <button
                                                        className="p-2 text-gray-500 hover:text-blue-500"
                                                        title="Upload Face"
                                                    >
                                                        <FiCamera />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingStudent(student)
                                                            setShowModal(true)
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-blue-500"
                                                        title="Edit"
                                                    >
                                                        <FiEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(student.id, student.full_name)}
                                                        className="p-2 text-gray-500 hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t flex items-center justify-between">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-500">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        No students found
                    </div>
                )}
            </div>

            <StudentFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                student={editingStudent}
                onSuccess={() => {
                    refetch()
                }}
            />
        </div>
    )
}
