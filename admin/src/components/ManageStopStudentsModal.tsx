import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { busesAPI } from '../lib/api'
import { FiX, FiSearch, FiUserPlus, FiUserMinus, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Student {
    id: string
    full_name: string
    roll_number?: string
    class_name?: string
    section?: string
    stop_id?: string
    stop_name?: string
}

interface ManageStopStudentsModalProps {
    busId: string
    routeId: string
    stop: {
        id: string
        name: string
    }
    onClose: () => void
}

export default function ManageStopStudentsModal({ busId, stop, onClose }: ManageStopStudentsModalProps) {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch all students on this bus
    const { data: studentsData, isLoading } = useQuery({
        queryKey: ['busStudents', busId],
        queryFn: () => busesAPI.listStudents(busId),
    })

    const allStudents: Student[] = studentsData?.data?.students || []

    const assignMutation = useMutation({
        mutationFn: ({ studentId, stopId }: { studentId: string; stopId: string | null }) =>
            busesAPI.assignStudentToStop(studentId, stopId as string), // api.ts expects string, but null usually unassigns. We might need to handle this.
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busStudents', busId] })
            queryClient.invalidateQueries({ queryKey: ['routes'] }) // To update counts
            toast.success('Updated successfully')
        },
        onError: () => toast.error('Failed to update student stop')
    })

    // Filter students
    const { assignedToThisStop, otherStudents } = useMemo(() => {
        const assigned: Student[] = []
        const others: Student[] = []

        allStudents.forEach(student => {
            const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (student.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesSearch) return

            if (student.stop_id === stop.id) {
                assigned.push(student)
            } else {
                others.push(student)
            }
        })

        return { assignedToThisStop: assigned, otherStudents: others }
    }, [allStudents, stop.id, searchQuery])

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Manage Students</h3>
                        <p className="text-sm text-gray-500">Stop: <span className="font-medium text-gray-900">{stop.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b bg-gray-50">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Assigned Column */}
                    <div className="flex flex-col gap-3">
                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{assignedToThisStop.length}</span>
                            Assigned to this stop
                        </h4>

                        {isLoading ? <div className="text-sm text-gray-500">Loading...</div> :
                            assignedToThisStop.length === 0 ? <div className="text-sm text-gray-400 italic">No students assigned here</div> :
                                assignedToThisStop.map(student => (
                                    <div key={student.id} className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center justify-between group">
                                        <div>
                                            <p className="font-medium text-gray-900">{student.full_name}</p>
                                            <p className="text-xs text-gray-500">{student.class_name}</p>
                                        </div>
                                        <button
                                            onClick={() => assignMutation.mutate({ studentId: student.id, stopId: null })}
                                            className="p-1.5 bg-white text-red-500 rounded border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                                            title="Remove from stop"
                                        >
                                            <FiUserMinus />
                                        </button>
                                    </div>
                                ))}
                    </div>

                    {/* Available Column */}
                    <div className="flex flex-col gap-3">
                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{otherStudents.length}</span>
                            Available Students
                        </h4>

                        {isLoading ? <div className="text-sm text-gray-500">Loading...</div> :
                            otherStudents.length === 0 ? <div className="text-sm text-gray-400 italic">No other students found</div> :
                                otherStudents.map(student => (
                                    <div key={student.id} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between group hover:border-blue-300 transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 truncate">{student.full_name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{student.class_name}</span>
                                                {student.stop_name && (
                                                    <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                        <FiAlertCircle size={10} />
                                                        At: {student.stop_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => assignMutation.mutate({ studentId: student.id, stopId: stop.id })}
                                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors ml-2"
                                            title={student.stop_name ? "Move to this stop" : "Assign to this stop"}
                                        >
                                            <FiUserPlus />
                                        </button>
                                    </div>
                                ))}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
