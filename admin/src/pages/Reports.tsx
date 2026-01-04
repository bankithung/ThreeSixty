import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI, attendanceAPI } from '../lib/api'
import { FiDownload, FiCalendar, FiBarChart2, FiPieChart, FiTrendingUp } from 'react-icons/fi'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { format, subDays } from 'date-fns'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
)

export default function Reports() {
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    })
    const [reportType, setReportType] = useState<'attendance' | 'trips' | 'overview'>('overview')

    const { data: dashboardData } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => reportsAPI.getDashboard(),
    })

    // Sample data for charts
    const attendanceData = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
            {
                label: 'Morning Pickup',
                data: [95, 93, 97, 94],
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 2,
            },
            {
                label: 'Evening Drop',
                data: [92, 90, 95, 91],
                backgroundColor: 'rgba(33, 150, 243, 0.6)',
                borderColor: 'rgba(33, 150, 243, 1)',
                borderWidth: 2,
            },
        ],
    }

    const tripCompletionData = {
        labels: ['Completed', 'Partial', 'Cancelled'],
        datasets: [
            {
                data: [85, 12, 3],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(244, 67, 54, 0.8)',
                ],
                borderWidth: 0,
            },
        ],
    }

    const trendData = {
        labels: Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29 - i), 'MMM d')),
        datasets: [
            {
                label: 'Students Transported',
                data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 150),
                borderColor: 'rgba(76, 175, 80, 1)',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                    {['overview', 'attendance', 'trips'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setReportType(type as any)}
                            className={`px-4 py-2 rounded-lg font-medium capitalize ${reportType === type
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <FiCalendar className="text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="px-3 py-2 rounded-lg border text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="px-3 py-2 rounded-lg border text-sm"
                        />
                    </div>
                    <button className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                        <FiDownload className="mr-2" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Avg Attendance Rate', value: '94.5%', icon: FiBarChart2, trend: '+2.3%' },
                    { label: 'Total Trips', value: '1,247', icon: FiTrendingUp, trend: '+15%' },
                    { label: 'On-Time Rate', value: '91.2%', icon: FiPieChart, trend: '+1.1%' },
                    { label: 'Incidents', value: '3', icon: FiBarChart2, trend: '-50%' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                <p className={`text-sm mt-1 ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                    {stat.trend} vs last month
                                </p>
                            </div>
                            <div className="p-3 bg-primary-100 rounded-lg">
                                <stat.icon className="w-6 h-6 text-primary-500" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trend */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Weekly Attendance Rate</h3>
                    <Bar
                        data={attendanceData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: { position: 'bottom' },
                            },
                            scales: {
                                y: { beginAtZero: true, max: 100 },
                            },
                        }}
                    />
                </div>

                {/* Trip Completion */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Trip Completion Rate</h3>
                    <div className="h-64 flex items-center justify-center">
                        <Doughnut
                            data={tripCompletionData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: { position: 'bottom' },
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 30-Day Trend */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">30-Day Transportation Trend</h3>
                <Line
                    data={trendData}
                    options={{
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                        },
                        scales: {
                            y: { beginAtZero: true },
                        },
                    }}
                />
            </div>

            {/* Report Summary Table */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Route Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">On-Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {[
                                { name: 'Route A - North', students: 45, trips: 60, attendance: 96, onTime: 92 },
                                { name: 'Route B - South', students: 38, trips: 58, attendance: 94, onTime: 88 },
                                { name: 'Route C - East', students: 52, trips: 62, attendance: 97, onTime: 95 },
                                { name: 'Route D - West', students: 41, trips: 59, attendance: 93, onTime: 90 },
                            ].map((route) => (
                                <tr key={route.name}>
                                    <td className="px-4 py-3 font-medium">{route.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{route.students}</td>
                                    <td className="px-4 py-3 text-gray-500">{route.trips}</td>
                                    <td className="px-4 py-3">
                                        <span className={`font-medium ${route.attendance >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {route.attendance}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`font-medium ${route.onTime >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {route.onTime}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
