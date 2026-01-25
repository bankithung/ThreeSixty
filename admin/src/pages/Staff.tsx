import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffAPI, accountsAPI, schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { 
    MdAdd, MdSearch, MdEdit, MdDelete, MdClose, MdPeople, MdCheckCircle, MdPersonAdd,
    MdPhone, MdEmail, MdExpandMore, MdCheck, MdCalendarToday,
    MdDownload, MdRefresh, MdAccessTime, MdWork, MdVisibility,
    MdTableChart, MdPictureAsPdf, MdGridOn
} from 'react-icons/md'
import { useAuth } from '../hooks/useAuth'
import ConfirmationModal from '../components/ConfirmationModal'

// Constants - Single source of truth
const ROLE_OPTIONS = [
    { id: '', name: 'All Roles' },
    { id: 'driver', name: 'Driver' },
    { id: 'conductor', name: 'Conductor' },
    { id: 'teacher', name: 'Teacher' },
    { id: 'principal', name: 'Principal' },
    { id: 'vice_principal', name: 'Vice Principal' },
    { id: 'office_staff', name: 'Office Staff' },
    { id: 'accountant', name: 'Accountant' },
    { id: 'librarian', name: 'Librarian' },
    { id: 'nurse', name: 'Nurse' },
    { id: 'security', name: 'Security' },
    { id: 'helper', name: 'Helper' },
    { id: 'supervisor', name: 'Supervisor' },
]

const STATUS_OPTIONS = [
    { id: 'all', name: 'All Status' },
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' },
]

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Utility function to get profile image URL
const getProfileImageUrl = (member: any) => {
    // Try staff profile photo first, then user avatar
    if (member.photo) {
        return member.photo.startsWith('http') ? member.photo : `${API_BASE_URL}${member.photo}`
    }
    if (member.avatar) {
        return member.avatar.startsWith('http') ? member.avatar : `${API_BASE_URL}${member.avatar}`
    }
    if (member.user?.avatar) {
        const avatar = member.user.avatar
        return avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`
    }
    return null
}

// Avatar Component with fallback
function Avatar({ member, size = '8' }: { member: any; size?: '8' | '10' }) {
    const [imageError, setImageError] = useState(false)
    const imageUrl = getProfileImageUrl(member)
    const initials = `${member.first_name?.[0]?.toUpperCase() || ''}${member.last_name?.[0]?.toUpperCase() || ''}`
    
    const sizeClasses = {
        '8': 'w-8 h-8 text-xs',
        '10': 'w-10 h-10 text-sm'
    }
    
    if (!imageUrl || imageError) {
        return (
            <div className={`${sizeClasses[size]} bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold flex-shrink-0`}>
                {initials || '?'}
            </div>
        )
    }
    
    return (
        <img 
            src={imageUrl} 
            alt={member.full_name}
            className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 border border-gray-200`}
            onError={() => setImageError(true)}
        />
    )
}

// Utility function to format date
const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
        return '-'
    }
}

// Utility function to get time ago
const getTimeAgo = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
        const date = new Date(dateString)
        const now = new Date()
        const diffInMs = now.getTime() - date.getTime()
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
        
        if (diffInDays === 0) return 'Today'
        if (diffInDays === 1) return 'Yesterday'
        if (diffInDays < 7) return `${diffInDays} days ago`
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
        if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
        return `${Math.floor(diffInDays / 365)} years ago`
    } catch {
        return '-'
    }
}

// Custom Dropdown Component
function Dropdown({ value, onChange, options, placeholder, className = '', multiple = false }: { 
    value: string | string[]; 
    onChange: (val: any) => void; 
    options: { id: string; name: string }[];
    placeholder?: string;
    className?: string;
    multiple?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const getDisplayValue = () => {
        if (multiple) {
            const valArray = value as string[]
            if (valArray.length === 0) return placeholder || 'Select...'
            if (valArray.length === 1) return options.find(o => o.id === valArray[0])?.name || valArray[0]
            return `${valArray.length} Selected`
        }
        const selected = options.find(o => o.id === value)
        return selected?.name || placeholder || 'Select...'
    }

    const handleSelect = (id: string) => {
        if (multiple) {
            const valArray = value as string[] || []
            let newValue: string[]
            if (valArray.includes(id)) {
                newValue = valArray.filter(v => v !== id)
            } else {
                newValue = [...valArray, id]
            }
            onChange(newValue)
            // Don't close on selection for multi-select
        } else {
            onChange(id)
            setIsOpen(false)
        }
    }

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-2 px-3 py-3 text-xs bg-white border border-gray-200 rounded-xl hover:border-gray-300 focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none min-w-[140px] transition-all"
            >
                <span className={`truncate ${((!value || (Array.isArray(value) && value.length === 0)) && placeholder) ? 'text-gray-500' : 'text-gray-900'}`}>
                    {getDisplayValue()}
                </span>
                <MdExpandMore className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
                    {options.map(opt => {
                        const isSelected = multiple 
                            ? (value as string[])?.includes(opt.id)
                            : value === opt.id
                        
                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleSelect(opt.id)}
                                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center justify-between ${isSelected ? 'text-primary-600 bg-primary-50' : 'text-gray-700'}`}
                            >
                                <span className="truncate">{opt.name}</span>
                                {isSelected && <MdCheck className="w-3.5 h-3.5 flex-shrink-0" />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// Role Badge Component
function RoleBadge({ role }: { role: string }) {
    const roleColors: Record<string, string> = {
        school_admin: 'bg-purple-100 text-purple-700 border-purple-200',
        office_staff: 'bg-blue-100 text-blue-700 border-blue-200',
        conductor: 'bg-green-100 text-green-700 border-green-200',
        driver: 'bg-orange-100 text-orange-700 border-orange-200',
        accountant: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        librarian: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        nurse: 'bg-pink-100 text-pink-700 border-pink-200',
        security: 'bg-gray-100 text-gray-700 border-gray-200',
        helper: 'bg-teal-100 text-teal-700 border-teal-200',
        teacher: 'bg-amber-100 text-amber-700 border-amber-200',
        principal: 'bg-rose-100 text-rose-700 border-rose-200',
        vice_principal: 'bg-rose-50 text-rose-600 border-rose-100',
        supervisor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    }
    return (
        <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${roleColors[role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
            {role?.replace(/_/g, ' ').toUpperCase()}
        </span>
    )
}

// Status Badge Component  
function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            {isActive ? 'Active' : 'Inactive'}
        </span>
    )
}

// Compact Stat Card Component
function StatCard({ label, value, icon: Icon, color, trend }: { 
    label: string; 
    value: number | string; 
    icon: React.ComponentType<{ className?: string }>; 
    color: string;
    trend?: string;
}) {
    const colorMap: Record<string, { icon: string; bg: string }> = {
        green: { icon: 'text-green-600', bg: 'bg-green-50' },
        purple: { icon: 'text-purple-600', bg: 'bg-purple-50' },
        blue: { icon: 'text-blue-600', bg: 'bg-blue-50' },
        pink: { icon: 'text-pink-600', bg: 'bg-pink-50' },
        orange: { icon: 'text-orange-600', bg: 'bg-orange-50' },
        indigo: { icon: 'text-indigo-600', bg: 'bg-indigo-50' },
    }
    const colors = colorMap[color] || colorMap.blue
    
    return (
        <div className="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                </div>
                {trend && (
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-[10px] text-gray-500 font-medium">{label}</p>
        </div>
    )
}



export default function Staff() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const schoolId = searchParams.get('school')
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string[]>([])
    const [statusFilter, setStatusFilter] = useState('active')

    const [confirmDelete, setConfirmDelete] = useState<{
        isOpen: boolean
        id: string
        name: string
    }>({ isOpen: false, id: '', name: '' })

    const { data: staffData, isLoading, refetch } = useQuery({
        queryKey: ['staff', search, roleFilter, schoolId, statusFilter],
        queryFn: () => staffAPI.list({
            search,
            role: roleFilter.length > 0 ? roleFilter.join(',') : '',
            school_id: schoolId,
            is_active: statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 'true' : 'false')
        }),
    })

    // Deactivate mutation (instead of deleting, we disable the account)
    const deactivateMutation = useMutation({
        mutationFn: (id: string) => staffAPI.update(id, { is_active: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success('Staff account deactivated successfully')
            setConfirmDelete({ isOpen: false, id: '', name: '' })
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Failed to deactivate staff member')
            setConfirmDelete({ isOpen: false, id: '', name: '' })
        },
    })

    const requestDeactivate = (member: any) => {
        setConfirmDelete({
            isOpen: true,
            id: member.id,
            name: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'this staff member',
        })
    }

    const staff = staffData?.data?.results || staffData?.data || []
    const totalCount = staffData?.data?.count || staff.length
    const activeStaff = staff.filter((m: any) => m.is_active).length
    const inactiveStaff = staff.filter((m: any) => !m.is_active).length
    const adminCount = staff.filter((m: any) => m.role === 'school_admin').length
    const teacherCount = staff.filter((m: any) => m.role === 'teacher').length
    const driverCount = staff.filter((m: any) => m.role === 'driver').length
    const conductorCount = staff.filter((m: any) => m.role === 'conductor').length

    const ROLES = ROLE_OPTIONS

    // Export state
    const [showExportMenu, setShowExportMenu] = useState(false)
    const exportMenuRef = useRef<HTMLDivElement>(null)

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Export as CSV
    const handleExportCSV = () => {
        const csvContent = [
            ['Name', 'Email', 'Phone', 'Role', 'Status', 'Join Date'].join(','),
            ...staff.map((member: any) => [
                `"${member.full_name || ''}"`,
                member.email || '',
                member.phone || '',
                member.role?.replace(/_/g, ' ') || '',
                member.is_active ? 'Active' : 'Inactive',
                formatDate(member.created_at) || ''
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `staff-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('Exported as CSV')
        setShowExportMenu(false)
    }

    // Export as PDF (simple HTML to print approach)
    const handleExportPDF = () => {
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Staff Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fafafa; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .date { color: #666; font-size: 12px; }
                    .active { color: green; } .inactive { color: red; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Staff Report</h1>
                    <p class="date">Generated: ${new Date().toLocaleDateString()}</p>
                </div>
                <table>
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Join Date</th></tr>
                    </thead>
                    <tbody>
                        ${staff.map((m: any) => `
                            <tr>
                                <td>${m.full_name || '-'}</td>
                                <td>${m.email || '-'}</td>
                                <td>${m.phone || '-'}</td>
                                <td>${m.role?.replace(/_/g, ' ') || '-'}</td>
                                <td class="${m.is_active ? 'active' : 'inactive'}">${m.is_active ? 'Active' : 'Inactive'}</td>
                                <td>${formatDate(m.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="margin-top:20px;font-size:11px;color:#888;">Total: ${staff.length} staff members</p>
            </body>
            </html>
        `
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(printContent)
            printWindow.document.close()
            printWindow.print()
        }
        toast.success('PDF ready to print/save')
        setShowExportMenu(false)
    }

    // Export as Excel (TSV format that Excel opens correctly)
    const handleExportExcel = () => {
        const header = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Join Date'].join('\t')
        const rows = staff.map((member: any) => [
            member.full_name || '',
            member.email || '',
            member.phone || '',
            member.role?.replace(/_/g, ' ') || '',
            member.is_active ? 'Active' : 'Inactive',
            formatDate(member.created_at) || ''
        ].join('\t'))
        
        const content = [header, ...rows].join('\n')
        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `staff-export-${new Date().toISOString().split('T')[0]}.xls`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('Exported as Excel')
        setShowExportMenu(false)
    }

    return (
        <div className="space-y-3 animate-fade-in pb-6">
            {/* Compact Header */}
            <div className="flex flex-col lg:flex-row gap-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all shadow-sm"
                    />
                </div>
                
                {/* Quick Filters */}
                <div className="flex gap-2">
                    <Dropdown 
                        value={roleFilter} 
                        onChange={setRoleFilter} 
                        options={ROLES.filter(r => r.id !== '')} 
                        placeholder="All Roles"
                        multiple={true}
                    />
                    <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
                    {/* Export Menu */}
                    <div className="relative" ref={exportMenuRef}>
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="px-3 py-3 text-xs bg-white border border-gray-200 rounded-xl hover:border-gray-300 text-gray-700 transition-all flex items-center gap-1.5"
                            title="Export Data"
                        >
                            <MdDownload className="w-3.5 h-3.5" />
                            <span>Export</span>
                            <MdExpandMore className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showExportMenu && (
                            <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <MdTableChart className="w-4 h-4 text-green-600" />
                                    Export as CSV
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <MdPictureAsPdf className="w-4 h-4 text-red-600" />
                                    Export as PDF
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <MdGridOn className="w-4 h-4 text-blue-600" />
                                    Export as Excel
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-3 text-xs bg-white border border-gray-200 rounded-xl hover:border-gray-300 text-gray-700 transition-all"
                        title="Refresh"
                    >
                        <MdRefresh className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => navigate('/staff/new')}
                        className="btn-primary text-xs flex items-center gap-1.5 py-3 px-4 rounded-xl whitespace-nowrap"
                    >
                        <MdAdd className="w-3.5 h-3.5" /> Add Staff
                    </button>
                </div>
            </div>


            {/* Compact Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <StatCard label="Total Staff" value={totalCount} icon={MdPeople} color="blue" />
                <StatCard label="Active" value={activeStaff} icon={MdCheckCircle} color="green" />
                <StatCard label="Inactive" value={inactiveStaff} icon={MdPeople} color="pink" />
                <StatCard label="Teachers" value={teacherCount} icon={MdWork} color="purple" />
                <StatCard label="Drivers" value={driverCount} icon={MdPeople} color="orange" />
                <StatCard label="Admins" value={adminCount} icon={MdPersonAdd} color="indigo" />
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
            ) : staff.length > 0 ? (
                <>
                    {/* Desktop Table - More Compact */}
                    <div className="hidden lg:block bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="px-3 py-2.5 text-left">
                                            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Staff Member</span>
                                        </th>
                                        <th className="px-3 py-2.5 text-left">
                                            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Contact</span>
                                        </th>
                                        <th className="px-3 py-2.5 text-left">
                                            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Role</span>
                                        </th>
                                        <th className="px-3 py-2.5 text-left">
                                            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Status</span>
                                        </th>
                                        <th className="px-3 py-2.5 text-left">
                                            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Join Date</span>
                                        </th>
                                        <th className="px-3 py-2.5 text-right w-20">
                                            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {staff.map((member: any) => (
                                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar member={member} size="10" />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm truncate">{member.full_name}</p>
                                                        {member.user?.username && (
                                                            <p className="text-xs text-gray-500 truncate">@{member.user.username}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="space-y-0.5">
                                                    {member.phone && (
                                                        <div className="flex items-center gap-1.5">
                                                            <MdPhone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                            <span className="text-xs text-gray-600 font-mono">{member.phone}</span>
                                                        </div>
                                                    )}
                                                    {member.email && (
                                        <div className="flex items-center gap-1.5">
                                            <MdEmail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-500 truncate max-w-[200px]">{member.email}</span>
                                        </div>
                                    )}
                                                    {!member.phone && !member.email && (
                                                        <span className="text-[10px] text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <RoleBadge role={member.role} />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <StatusBadge isActive={member.is_active} />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                    <MdCalendarToday className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-600 font-medium">{formatDate(member.created_at)}</p>
                                        <p className="text-[11px] text-gray-400">{getTimeAgo(member.created_at)}</p>
                                    </div>
                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/staff/${member.id}`)}
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                        title="View Profile"
                                                    >
                                                        <MdVisibility className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/staff/edit/${member.id}`)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <MdEdit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => requestDeactivate(member)}
                                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                                        title="Deactivate"
                                                    >
                                                        <MdDelete className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile/Tablet Cards Grid */}
                    <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {staff.map((member: any) => (
                            <div key={member.id} className="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-all">
                                <div className="flex items-start gap-2.5 mb-2">
                                    <Avatar member={member} size="10" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-gray-900 text-sm truncate">{member.full_name}</h4>
                                                {member.user?.username && (
                                                    <p className="text-xs text-gray-500 truncate">@{member.user.username}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                        onClick={() => navigate(`/staff/${member.id}`)}
                                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                    >
                                        <MdVisibility className="w-3.5 h-3.5" />
                                    </button>
                                                <button
                                        onClick={() => navigate(`/staff/edit/${member.id}`)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                        <MdEdit className="w-3.5 h-3.5" />
                                    </button>
                                                <button
                                        onClick={() => requestDeactivate(member)}
                                        className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                    >
                                        <MdDelete className="w-3.5 h-3.5" />
                                    </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5 mb-2">
                                    {member.phone && (
                                        <div className="flex items-center gap-1.5">
                                            <MdPhone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-600 font-mono">{member.phone}</span>
                                        </div>
                                    )}
                                    {member.email && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
                                            <MdEmail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            <span className="truncate">{member.email}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <RoleBadge role={member.role} />
                                        <StatusBadge isActive={member.is_active} />
                                    </div>
                                    {member.created_at && (
                                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                            <MdAccessTime className="w-3.5 h-3.5" />
                                            <span>{getTimeAgo(member.created_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-lg border border-gray-100 flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <MdPeople className="text-gray-400 w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">No staff found</h3>
                    <p className="text-xs text-gray-500 mt-1">Get started by adding a staff member</p>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: '', name: '' })}
                onConfirm={() => deactivateMutation.mutate(confirmDelete.id)}
                title="Deactivate Staff Account"
                message={`Are you sure you want to deactivate ${confirmDelete.name}? The account will be disabled but data will be preserved.`}
                confirmLabel="Deactivate"
                variant="danger"
                isLoading={deactivateMutation.isPending}
            />
        </div>
    )
}

// Staff Modal Component
function StaffModal({ onClose, initialData, userRole }: { onClose: () => void; initialData?: any; userRole?: string }) {
    const queryClient = useQueryClient()
    const isEditing = !!initialData

    const { data: schoolsData } = useQuery({
        queryKey: ['schools'],
        queryFn: () => schoolsAPI.list(),
        enabled: userRole === 'root_admin',
    })

    const { data: userSchoolsData } = useQuery({
        queryKey: ['userSchools'],
        queryFn: () => accountsAPI.getUserSchools(),
        enabled: userRole !== 'root_admin',
    })

    const schools = schoolsData?.data?.results || schoolsData?.data || []
    const userSchools = userSchoolsData?.data?.results || userSchoolsData?.data || []

    const [formData, setFormData] = useState({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        role: initialData?.role || 'teacher',
        password: '',
        school_id: initialData?.school?.id || initialData?.school_id || (userSchools[0]?.school?.id || userSchools[0]?.school || ''),
    })

    const mutation = useMutation({
        mutationFn: (data: any) => isEditing ? staffAPI.update(initialData.id, data) : staffAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success(isEditing ? 'Staff updated successfully' : 'Staff created successfully')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to save')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const data = { ...formData }
        if (!data.school_id && userSchools.length > 0) {
            const school = userSchools[0].school
            data.school_id = typeof school === 'object' ? school.id : school
        }
        if (!data.school_id) {
            toast.error('Please select a school')
            return
        }
        mutation.mutate(data)
    }

    const ROLE_OPTIONS = [
        { value: 'teacher', label: 'Teacher' },
        { value: 'conductor', label: 'Conductor' },
        { value: 'driver', label: 'Driver' },
        { value: 'office_staff', label: 'Office Staff' },
        { value: 'accountant', label: 'Accountant' },
        { value: 'librarian', label: 'Librarian' },
        { value: 'nurse', label: 'Nurse' },
        { value: 'security', label: 'Security' },
        { value: 'helper', label: 'Helper' },
        { value: 'principal', label: 'Principal' },
        { value: 'vice_principal', label: 'Vice Principal' },
        { value: 'supervisor', label: 'Supervisor' },
        ...(userRole === 'root_admin' ? [{ value: 'school_admin', label: 'School Admin' }] : []),
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {isEditing ? 'Edit Staff' : 'Add Staff Member'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none"
                        >
                            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    {userRole === 'root_admin' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">School *</label>
                            <select
                                required
                                value={formData.school_id}
                                onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none"
                            >
                                <option value="">Select School</option>
                                {schools.map((school: any) => (
                                    <option key={school.id} value={school.id}>{school.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!isEditing && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-300 outline-none"
                                placeholder="Min 8 characters"
                            />
                        </div>
                    )}
                </form>

                <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Staff'}
                    </button>
                </div>
            </div>
        </div>
    )
}
