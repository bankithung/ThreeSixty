import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { staffAPI } from '../lib/api'
import { FiSearch, FiPhone, FiMail, FiUser } from 'react-icons/fi'

export default function Teachers() {
    const [searchParams] = useSearchParams()
    const schoolId = searchParams.get('school')
    const [search, setSearch] = useState('')

    const { data: staffData, isLoading } = useQuery({
        queryKey: ['teachers', search, schoolId],
        queryFn: () => staffAPI.list({ search, school: schoolId, role: 'teacher' }),
    })

    const teachers = staffData?.data?.results || staffData?.data || []

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search teachers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : teachers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {teachers.map((teacher: any) => (
                                    <tr key={teacher.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <FiUser className="text-purple-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{teacher.full_name}</div>
                                                    <div className="text-xs text-gray-500">@{teacher.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {teacher.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <FiPhone className="mr-2 text-gray-400" size={14} />
                                                        {teacher.phone}
                                                    </div>
                                                )}
                                                {teacher.email && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <FiMail className="mr-2 text-gray-400" size={14} />
                                                        {teacher.email}
                                                    </div>
                                                )}
                                                {!teacher.phone && !teacher.email && (
                                                    <span className="text-sm text-gray-400">No contact info</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {teacher.employee_id || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {teacher.school_name || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${teacher.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {teacher.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        {search ? 'No teachers found matching your search' : 'No teachers found'}
                    </div>
                )}
            </div>
        </div>
    )
}
