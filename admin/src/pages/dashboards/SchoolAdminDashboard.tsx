import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
    FiUsers, FiTruck, FiActivity, FiArrowUp, FiArrowDown, 
    FiCheckCircle, FiAlertCircle, FiClock, FiMapPin, FiLock 
} from 'react-icons/fi'
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
    Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { useLayout } from '../../context/LayoutContext'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
)

export default function SchoolAdminDashboard({ stats }: { stats: any }) {
    const { setHeaderContent } = useLayout()
    
    // Safety checks for undefined data
    const overview = stats.overview || {}
    const trips = stats.trips || {}
    const finance = stats.finance || {}
    const charts = stats.charts || {}
    const liveActivity = stats.live_activity || []
    const alerts = stats.alerts || []
    const activeFeatures = stats.active_features || []
    const schoolLogo = stats.school_logo

    // Constants
    const FEATURE_TRANSPORT = 'transport' // Ensure this matches backend code (lowercase or uppercase?)
    // Converting backend codes to lowercase for safe comparison if needed. 
    // Assuming backend sends 'transport' or checking generic 'transport' related availability.
    // Actually backend usually sends codes exactly. I'll make a helper checks.
    
    // Helper to check feature access
    const hasFeature = (code: string) => {
        // Handle case-insensitive check
        return activeFeatures.some((f: string) => f.toLowerCase() === code.toLowerCase())
    }

    // Set Header Content
    useEffect(() => {
        setHeaderContent(
            <div className="flex flex-col md:flex-row md:items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    {schoolLogo ? (
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 shadow-sm p-1 flex items-center justify-center overflow-hidden">
                            <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                         <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg uppercase">
                            {stats.school_name?.[0]}
                         </div>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 leading-tight">{stats.school_name}</h1>
                        <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center text-green-600 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"/> System Online</span>
                            <span>•</span>
                            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
        return () => setHeaderContent(null)
    }, [stats.school_name, schoolLogo, setHeaderContent])

    // Chart Data Construction
    const attendanceChartData = useMemo(() => {
        const labels = charts.attendance_7_days?.map((d: any) => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })) || []
        const data = charts.attendance_7_days?.map((d: any) => d.count) || []
        
        return {
            labels,
            datasets: [
                {
                    label: 'Present Students',
                    data,
                    borderColor: '#0ea5e9', // Sky 500
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                }
            ]
        }
    }, [charts.attendance_7_days])

    const tripStatusData = useMemo(() => {
        return {
            labels: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
            datasets: [
                {
                    data: [trips.scheduled || 0, trips.in_progress || 0, trips.completed || 0, trips.cancelled || 0],
                    backgroundColor: ['#e2e8f0', '#3b82f6', '#22c55e', '#ef4444'], // Slate 200, Blue 500, Green 500, Red 500
                    borderWidth: 0,
                }
            ]
        }
    }, [trips])

    return (
        <div className="space-y-4 animate-fade-in pb-4">
            
            {/* 1. Key Metrics Grid (Compact) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                <MetricCard 
                    title="Total Students"
                    value={overview.total_students}
                    subValue={`${overview.present_today || 0} Present Today`}
                    trend={overview.attendance_percentage}
                    trendLabel="Attendance Rate"
                    icon={FiUsers}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />

                 <MetricCard 
                    title="Total Employees"
                    value={overview.total_staff || 0}
                    subValue="Active Staff"
                    icon={FiUsers}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
                
                {/* Transport Widgets wrapped in FeatureGuard */}
                <FeatureGuard hasAccess={hasFeature(FEATURE_TRANSPORT)} label="Transport Module">
                    <MetricCard 
                        title="Active Fleet"
                        value={overview.active_fleet_count}
                        subValue={`of ${overview.total_buses} Buses Active`}
                        icon={FiTruck}
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                        isLive
                    />
                </FeatureGuard>

                <FeatureGuard hasAccess={hasFeature(FEATURE_TRANSPORT)} label="Transport Module">
                    <MetricCard 
                        title="Trip Completion"
                        value={`${trips.completed}/${trips.total}`}
                        subValue="Trips Today"
                        trend={trips.total > 0 ? (trips.completed/trips.total * 100) : 0}
                        trendLabel="Completion Rate"
                        icon={FiCheckCircle}
                        color="text-green-600"
                        bg="bg-green-50"
                    />
                </FeatureGuard>

                <FeatureGuard hasAccess={hasFeature(FEATURE_TRANSPORT)} label="Transport Module">
                    <MetricCard 
                        title="Net Profit (Mo)"
                        value={`₹${(finance.net_profit || 0).toLocaleString()}`}
                        subValue={`Exp: ₹${(finance.month_expenses || 0).toLocaleString()}`}
                        icon={FiActivity}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                </FeatureGuard>
            </div>

            {/* 2. Charts & Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                {/* Attendance Trend (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Attendance Trend (7 Days)</h3>
                         {/* Trend Calc Mockup */}
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Last 7 Days</span>
                    </div>
                    <div className="h-[230px] w-full">
                        <Line 
                            data={attendanceChartData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { 
                                        beginAtZero: true, 
                                        grid: { color: '#f3f4f6' },
                                        ticks: { font: { size: 10 } }
                                    },
                                    x: { 
                                        grid: { display: false },
                                        ticks: { font: { size: 10 } }
                                    }
                                }
                            }} 
                        />
                    </div>
                </div>

                {/* Trip Status Breakdown (1 col) */}
                <FeatureGuard hasAccess={hasFeature(FEATURE_TRANSPORT)} label="Transport Module" className="h-[300px]">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-full flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Today's Operations</h3>
                        <div className="flex-1 flex items-center justify-center relative">
                            <div className="w-[180px] h-[180px]">
                                <Doughnut 
                                    data={tripStatusData} 
                                    options={{
                                        cutout: '70%',
                                        plugins: { legend: { display: false } }
                                    }} 
                                />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-3xl font-bold text-gray-800">{trips.total || 0}</span>
                                <span className="text-xs text-gray-400 font-medium uppercase">Total Trips</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"/> In Progress</div>
                            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"/> Completed</div>
                            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-slate-200 mr-2"/> Scheduled</div>
                            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-2"/> Cancelled</div>
                        </div>
                    </div>
                </FeatureGuard>
            </div>

            {/* 3. Live Activity & Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Live Fleet Table */}
                <FeatureGuard hasAccess={hasFeature(FEATURE_TRANSPORT)} label="Transport Module">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[250px]">
                        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                                <FiMapPin className="mr-2 text-primary-500"/> Live Fleet Activity
                            </h3>
                            <Link to="/trips" className="text-xs text-primary-600 font-medium hover:underline">View All</Link>
                        </div>
                        <div className="overflow-auto max-h-[250px] flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Bus / Route</th>
                                        <th className="px-4 py-2 font-medium">Driver</th>
                                        <th className="px-4 py-2 font-medium">Status</th>
                                        <th className="px-4 py-2 font-medium text-right">Load</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {liveActivity.length > 0 ? liveActivity.map((trip: any, i: number) => (
                                        <tr key={trip.id || i} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-4 py-2">
                                                <div className="font-medium text-gray-800">{trip.bus}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[120px]" title={trip.route}>{trip.route}</div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="text-gray-700">{trip.driver}</div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <TripStatusBadge status={trip.status} />
                                                <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <FiClock className="w-3 h-3"/> {new Date(trip.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                                    {trip.passengers}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                                                No active trips at this moment.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </FeatureGuard>

                {/* Alerts / Notifications Panel */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col p-4 h-full min-h-[200px]">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            <FiAlertCircle className="mr-2 text-orange-500"/> System Alerts
                        </h3>
                    </div>
                    <div className="space-y-3 flex-1 overflow-auto max-h-[250px] pr-2 custom-scrollbar">
                        {alerts.length > 0 ? alerts.map((alert: any) => (
                            <AlertItem 
                                key={alert.id}
                                type={alert.type} 
                                title={alert.title} 
                                desc={alert.desc} 
                                time={new Date(alert.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            />
                        )) : (
                            <div className="text-center text-xs text-center text-gray-400 py-8 italic">
                                No new system alerts.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Helper Components for Compact UI

function FeatureGuard({ hasAccess, label, children, className = '' }: any) {
    if (hasAccess) return children

    return (
        <div className={`relative group ${className}`}>
            <div className="blur-[2px] opacity-70 pointer-events-none select-none h-full">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/10 z-10 transition-colors group-hover:bg-gray-50/20">
                <div className="bg-white p-3 rounded-full shadow-lg border border-gray-200 mb-2 transform group-hover:scale-110 transition-transform">
                    <FiLock className="w-5 h-5 text-gray-500" />
                </div>
                <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200 absolute top-1/2 mt-8">
                    Subscribe to {label}
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, subValue, trend, icon: Icon, color, bg, isLive }: any) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group h-full">
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
                    <div className="flex items-baseline mt-1 gap-2">
                        <h3 className="text-xl font-bold text-gray-900">{value}</h3>
                        {trend !== undefined && (
                            <span className={`text-[10px] font-medium flex items-center ${trend >= 90 ? 'text-green-600' : trend >= 70 ? 'text-orange-500' : 'text-red-500'}`}>
                                {trend >= 80 ? <FiArrowUp className="mr-0.5"/> : <FiArrowDown className="mr-0.5"/>}
                                {Math.round(trend)}%
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{subValue}</p>
                </div>
                <div className={`p-2 rounded-md ${bg} ${color}`}>
                     <Icon className="w-4 h-4" />
                </div>
            </div>
            {isLive && (
                <div className="absolute top-0 right-0 p-1.5">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </div>
            )}
        </div>
    )
}

function TripStatusBadge({ status }: { status: string }) {
    const styles: any = {
        scheduled: "bg-gray-100 text-gray-600 border-gray-200",
        in_progress: "bg-blue-50 text-blue-700 border-blue-100 animate-pulse",
        completed: "bg-green-50 text-green-700 border-green-100",
        cancelled: "bg-red-50 text-red-700 border-red-100",
    }
    const labels: any = {
        scheduled: "Scheduled",
        in_progress: "On Route",
        completed: "Completed",
        cancelled: "Cancelled"
    }
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium inline-block ${styles[status] || styles.scheduled}`}>
            {labels[status] || status}
        </span>
    )
}

function AlertItem({ type, title, desc, time }: any) {
    const colors: any = {
        warning: 'border-l-orange-500 bg-orange-50/50',
        critical: 'border-l-red-500 bg-red-50/50',
        info: 'border-l-blue-500 bg-blue-50/50'
    }
    
    return (
        <div className={`border-l-2 p-2 rounded-r bg-white text-xs ${colors[type] || colors.info}`}>
            <div className="flex justify-between items-start">
                <span className="font-semibold text-gray-800">{title}</span>
                <span className="text-[9px] text-gray-400 whitespace-nowrap ml-2">{time}</span>
            </div>
            <p className="text-gray-600 mt-0.5">{desc}</p>
        </div>
    )
}
