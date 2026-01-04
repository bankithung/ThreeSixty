import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceAPI } from '../lib/api'
import { FiCalendar, FiDownload, FiFilter } from 'react-icons/fi'
import { format } from 'date-fns'

export default function Attendance() {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [tripId, setTripId] = useState('')

    const { data: attendanceData, isLoading } = useQuery({
        queryKey: ['attendance', date, tripId],
        queryFn: () => attendanceAPI.list({ date, trip_id: tripId }),
    })

    const records = attendanceData?.data?.results || attendanceData?.data || []

    const methodColors: Record<string, string> = {
        face_scan: 'bg-purple-100 text-purple-700',
        manual: 'bg-blue-100 text-blue-700',
        rfid: 'bg-green-100 text-green-700',
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center space-x-2">
                    <FiCalendar className="text-gray-400" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
                    <FiFilter className="mr-2" />
                    More Filters
                </button>
                <button className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 ml-auto">
                    <FiDownload className="mr-2" />
                    Export
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Check-ins', value: records.filter((r: any) => r.event_type === 'checkin').length, color: 'green' },
                    { label: 'Total Check-outs', value: records.filter((r: any) => r.event_type === 'checkout').length, color: 'blue' },
                    { label: 'Face Scans', value: records.filter((r: any) => r.method === 'face_scan').length, color: 'purple' },
                    { label: 'Manual', value: records.filter((r: any) => r.method === 'manual').length, color: 'orange' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4">
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : records.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stop</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {records.map((record: any) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(record.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                                    <span className="text-primary-600 text-xs font-semibold">
                                                        {record.student_name?.[0]}
                                                    </span>
                                                </div>
                                                <span className="ml-3 text-sm font-medium">{record.student_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.event_type === 'checkin' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {record.event_type === 'checkin' ? 'Check In' : 'Check Out'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${methodColors[record.method] || 'bg-gray-100'}`}>
                                                {record.method?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {record.method === 'face_scan' ? (
                                                <span className={record.confidence_score >= 0.8 ? 'text-green-600' : 'text-yellow-600'}>
                                                    {Math.round(record.confidence_score * 100)}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {record.stop_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        No attendance records for this date
                    </div>
                )}
            </div>
        </div>
    )
}
