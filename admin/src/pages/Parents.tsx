import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { parentsAPI } from '../lib/api'
import { FiSearch, FiPhone, FiMail, FiUser } from 'react-icons/fi'

export default function Parents() {
    const [search, setSearch] = useState('')

    const { data: parentsData, isLoading } = useQuery({
        queryKey: ['parents', search],
        queryFn: () => parentsAPI.list({ search }),
    })

    const parents = parentsData?.data?.results || parentsData?.data || []

    const relationColors: Record<string, string> = {
        father: 'bg-blue-100 text-blue-700',
        mother: 'bg-pink-100 text-pink-700',
        guardian: 'bg-purple-100 text-purple-700',
        other: 'bg-gray-100 text-gray-700',
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search parents or students..."
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
                ) : parents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {parents.map((parent: any) => (
                                    <tr key={parent.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                    <FiUser className="text-primary-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{parent.full_name}</div>
                                                    {parent.is_primary && (
                                                        <span className="text-xs text-green-600">Primary Contact</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {parent.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <FiPhone className="mr-2 text-gray-400" size={14} />
                                                        {parent.phone}
                                                    </div>
                                                )}
                                                {parent.email && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <FiMail className="mr-2 text-gray-400" size={14} />
                                                        {parent.email}
                                                    </div>
                                                )}
                                                {!parent.phone && !parent.email && (
                                                    <span className="text-sm text-gray-400">No contact info</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${relationColors[parent.relation] || 'bg-gray-100'}`}>
                                                {parent.relation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{parent.student_name}</div>
                                            <div className="text-xs text-gray-500">#{parent.student_admission_number}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {parent.student_grade}
                                            {parent.student_section && ` - ${parent.student_section}`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        {search ? 'No parents found matching your search' : 'No parents found'}
                    </div>
                )}
            </div>
        </div>
    )
}
