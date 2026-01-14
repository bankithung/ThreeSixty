import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { busesAPI } from '../../../lib/api'
import { FiSearch, FiPhone, FiMapPin, FiUser, FiPlus } from 'react-icons/fi'
import AssignStudentModal from './AssignStudentModal'

interface BusStudentsProps {
    busId: string
}

export default function BusStudents({ busId }: BusStudentsProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

    const { data: studentsData, isLoading } = useQuery({
        queryKey: ['busStudents', busId],
        queryFn: () => busesAPI.listStudents(busId)
    })

    // Robust parsing: if studentsData is array, use it. If it has .data property which is array, use that. Else empty.
    const students = Array.isArray(studentsData) ? studentsData : (Array.isArray(studentsData?.data) ? studentsData?.data : [])

    const filteredStudents = students.filter((student: any) =>
        (student.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.admission_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) return <div className="text-center py-8">Loading students...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiUser className="text-gray-400" />
                    Assigned Students
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {students.length}
                    </span>
                </h3>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
                    >
                        <FiPlus className="w-4 h-4" />
                        Assign Student
                    </button>
                </div>
            </div>

            <AssignStudentModal
                busId={busId}
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
            />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiUsersIcon />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No students found</h3>
                        <p className="text-gray-500 mt-1">This bus doesn't have any students assigned yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Class</th>
                                    <th className="px-6 py-4">Route & Stop</th>
                                    <th className="px-6 py-4">Parent Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student: any) => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs uppercase">
                                                    {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {student.first_name} {student.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{student.admission_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {student.class_name} {student.section}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {student.route_name ? (
                                                    <div className="flex items-center gap-1.5 text-gray-900 font-medium text-xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        {student.route_name}
                                                    </div>
                                                ) : <span className="text-gray-400 italic">No Route</span>}

                                                {student.stop_name && (
                                                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                        <FiMapPin className="w-3 h-3" />
                                                        {student.stop_name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gray-900 font-medium">{student.father_name || student.mother_name || '-'}</span>
                                                {(student.father_mobile || student.mother_mobile) && (
                                                    <a href={`tel:${student.father_mobile || student.mother_mobile}`} className="flex items-center gap-1.5 text-blue-600 hover:underline text-xs">
                                                        <FiPhone className="w-3 h-3" />
                                                        {student.father_mobile || student.mother_mobile}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

function FiUsersIcon() {
    return <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
}
