import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schoolsAPI, subscriptionsAPI } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useLayout } from '../context/LayoutContext'
import toast from 'react-hot-toast'
import {
    FiUsers, FiTruck, FiActivity, FiSettings, FiDollarSign, FiDatabase,
    FiLock, FiUnlock, FiLayers, FiArrowLeft, FiPhone, FiMail, FiGlobe,
    FiMapPin, FiBook, FiHome, FiCopy, FiCheck, FiEdit2, FiUser, FiGrid
} from 'react-icons/fi'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import ConfirmationModal from '../components/ConfirmationModal'
import EditSchoolModal from '../components/EditSchoolModal'
import FeatureManagement from '../components/FeatureManagement'
import StorageDetailsModal from '../components/StorageDetailsModal'
import EditableField from '../components/EditableField'

// Compact stat card component
function MiniStatCard({ label, value, icon: Icon, color, link, onClick, showViewButton = false }: {
    label: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
    color: string
    link?: string
    onClick?: () => void
    showViewButton?: boolean
}) {
    const cardContent = (
        <div className={`bg-white rounded-lg border border-gray-100 p-3 transition-all hover:shadow-sm hover:border-gray-200 ${link || onClick ? 'cursor-pointer' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${color}-50`}>
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-gray-900">{value}</p>
                        {showViewButton && (link || onClick) && (
                            <span className={`flex items-center gap-1 text-${color}-600 text-xs font-medium`}>
                                View
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
    if (link) return <Link to={link}>{cardContent}</Link>
    if (onClick) return <button onClick={onClick} className="w-full text-left">{cardContent}</button>
    return cardContent
}

// Info item with copy functionality
function InfoItem({ icon: Icon, label, value, copyable = false }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | null | undefined
    copyable?: boolean
}) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (value) {
            navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="flex items-start gap-2 group">
            <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{value || '-'}</p>
            </div>
            {copyable && value && (
                <button
                    onClick={handleCopy}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-all"
                    title="Copy"
                >
                    {copied ? <FiCheck className="w-3.5 h-3.5 text-green-600" /> : <FiCopy className="w-3.5 h-3.5" />}
                </button>
            )}
        </div>
    )
}

// Insight metric card
function InsightCard({ label, value, status, description }: {
    label: string
    value: string
    status: 'good' | 'warning' | 'neutral'
    description?: string
}) {
    const statusColors = {
        good: 'bg-green-50 text-green-700 border-green-200',
        warning: 'bg-orange-50 text-orange-700 border-orange-200',
        neutral: 'bg-gray-50 text-gray-700 border-gray-200'
    }
    return (
        <div className={`p-3 rounded-lg border ${statusColors[status]}`}>
            <p className="text-xs font-medium opacity-75">{label}</p>
            <p className="text-lg font-bold">{value}</p>
            {description && <p className="text-xs opacity-75 mt-1">{description}</p>}
        </div>
    )
}

// Facility tag
function FacilityTag({ name, active = true }: { name: string; active?: boolean }) {
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
            {name}
        </span>
    )
}

// School Map Component
const MAP_CONTAINER_STYLE = { width: '100%', height: '180px' }

function SchoolMap({ lat, lng, schoolName }: { lat: number; lng: number; schoolName: string }) {
    // Use same API key pattern as LiveBusTrackingModal
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDilPB9G_6IJAwdD734gs2S6BJZF_PE1ec'
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    })

    if (loadError) {
        return (
            <div className="mt-4 h-[180px] bg-red-50 rounded-lg flex items-center justify-center text-red-500 text-sm">
                Failed to load map
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="mt-4 h-[180px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm animate-pulse">
                Loading map...
            </div>
        )
    }

    return (
        <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
            <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={{ lat, lng }}
                zoom={15}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                }}
            >
                <Marker
                    position={{ lat, lng }}
                    title={schoolName}
                />
            </GoogleMap>
        </div>
    )
}

// Feature Guard Component - locks content if feature is not subscribed
function FeatureGuard({ hasAccess, label, children }: { hasAccess: boolean; label: string; children: React.ReactNode }) {
    if (hasAccess) return <>{children}</>

    return (
        <div className="relative group">
            <div className="blur-[2px] opacity-70 pointer-events-none select-none">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/10 z-10 transition-colors group-hover:bg-gray-50/20 rounded-lg">
                <div className="bg-white p-2 rounded-full shadow-lg border border-gray-200 transform group-hover:scale-110 transition-transform">
                    <FiLock className="w-4 h-4 text-gray-500" />
                </div>
                <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 whitespace-nowrap">
                    Requires {label}
                </div>
            </div>
        </div>
    )
}

export default function SchoolDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { setHeaderContent } = useLayout()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('overview')

    const isRootAdmin = user?.role === 'root_admin'
    const isSchoolAdmin = user?.role === 'school_admin'
    const canEdit = isRootAdmin || isSchoolAdmin

    // Set header
    useEffect(() => {
        setHeaderContent(
            <h1 className="text-xl font-semibold text-gray-800">
                {isRootAdmin ? 'School Profile' : 'My School'}
            </h1>
        )
        return () => setHeaderContent(null)
    }, [isRootAdmin, setHeaderContent])

    // Queries
    const { data: schoolData, isLoading } = useQuery({
        queryKey: ['school', id],
        queryFn: () => schoolsAPI.get(id!),
        enabled: !!id,
    })

    const { data: statsData } = useQuery({
        queryKey: ['schoolStats', id],
        queryFn: () => schoolsAPI.getStats(id!),
        enabled: !!id,
    })

    // Mutations
    const blockMutation = useMutation({
        mutationFn: ({ id, action }: { id: string; action: 'block' | 'unblock' }) => schoolsAPI.block(id, action),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['school', id] })
            queryClient.invalidateQueries({ queryKey: ['schools'] })
            toast.success(data.data.message || 'School status updated')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update school status')
        }
    })

    const updateMutation = useMutation({
        mutationFn: (data: any) => schoolsAPI.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school', id] })
            toast.success('Updated successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update')
        }
    })

    const school = schoolData?.data
    const stats = statsData?.data

    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isStorageModalOpen, setIsStorageModalOpen] = useState(false)

    // Inline field update handler
    const handleFieldUpdate = async (key: string, value: string) => {
        await updateMutation.mutateAsync({ [key]: value })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            </div>
        )
    }

    if (!school) {
        return (
            <div className="text-center py-12 text-gray-500">School not found</div>
        )
    }

    const handleBlockConfirm = () => {
        blockMutation.mutate({ id: school.id, action: school.is_active ? 'block' : 'unblock' })
        setIsBlockModalOpen(false)
    }

    // Calculate insights
    const studentTeacherRatio = stats?.total_students && school?.teacher_count
        ? Math.round(stats.total_students / school.teacher_count)
        : null
    const capacityUsage = stats?.total_students && school?.capacity
        ? Math.round((stats.total_students / school.capacity) * 100)
        : null

    // Feature access checking
    const FEATURE_TRANSPORT = 'transport'
    const activeFeatures = school?.active_features || {}
    const hasFeature = (code: string) => {
        // Check if feature exists and is active
        return Object.keys(activeFeatures).some((f: string) => f.toLowerCase() === code.toLowerCase())
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiActivity },
        { id: 'academic', label: 'Academic', icon: FiBook },
        { id: 'infrastructure', label: 'Infrastructure', icon: FiHome },
        { id: 'features', label: 'Features', icon: FiLayers },
        { id: 'financials', label: 'Financials', icon: FiDollarSign },
        ...(isRootAdmin ? [{ id: 'admin', label: 'Admin', icon: FiSettings }] : [])
    ]

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Back Button */}
            {isRootAdmin && (
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
                >
                    <FiArrowLeft className="mr-1.5 w-4 h-4" />
                    Back
                </button>
            )}

            {/* Compact Header */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* School Identity */}
                    <div className="flex items-center gap-3">
                        {school.logo ? (
                            <img src={school.logo} alt={school.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        ) : (
                            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-primary-700 font-bold text-lg">{school.name?.[0]}</span>
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-gray-900">{school.name}</h1>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${school.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {school.is_active ? 'Active' : 'Blocked'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{school.code}</span>
                                <span>•</span>
                                <span>{school.city}, {school.state}</span>
                                {school.pricing_plan && (
                                    <>
                                        <span>•</span>
                                        <span className="text-primary-600 font-medium">{school.pricing_plan} Plan</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="flex items-center px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                <FiEdit2 className="mr-1.5 w-3.5 h-3.5" />
                                Edit
                            </button>
                        )}
                        {isRootAdmin && (
                            <button
                                onClick={() => setIsBlockModalOpen(true)}
                                disabled={blockMutation.isPending}
                                className={`flex items-center px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${school.is_active
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-green-200 text-green-600 hover:bg-green-50'
                                }`}
                            >
                                {school.is_active ? <FiLock className="mr-1.5 w-3.5 h-3.5" /> : <FiUnlock className="mr-1.5 w-3.5 h-3.5" />}
                                {school.is_active ? 'Block' : 'Unblock'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 overflow-x-auto pb-1 -mb-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <tab.icon className={`mr-1.5 w-4 h-4 ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-500'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Stats Grid - 6 columns */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <MiniStatCard label="Employees" value={stats?.total_staff || 0} icon={FiUsers} color="green" link={`/staff?school=${id}`} showViewButton />
                        <MiniStatCard label="Teachers" value={stats?.total_teachers || 0} icon={FiUser} color="purple" link={`/teachers?school=${id}`} showViewButton />
                        <MiniStatCard label="Students" value={stats?.total_students || 0} icon={FiUsers} color="blue" link={`/students?school=${id}`} showViewButton />
                        <MiniStatCard label="Parents" value={stats?.total_parents || 0} icon={FiUsers} color="pink" link={`/parents?school=${id}`} showViewButton />
                        <FeatureGuard hasAccess={hasFeature(FEATURE_TRANSPORT)} label="Transport">
                            <MiniStatCard label="Buses" value={stats?.total_buses || 0} icon={FiTruck} color="orange" link={`/buses?school=${id}`} showViewButton />
                        </FeatureGuard>
                        <MiniStatCard label="Storage" value={`${Math.round((school?.data_usage || 0) / (1024 * 1024))} MB`} icon={FiDatabase} color="cyan" onClick={() => setIsStorageModalOpen(true)} />
                    </div>

                    {/* Main Info Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Contact & Location */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4 lg:col-span-2">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FiMapPin className="w-4 h-4 text-gray-500" />
                                Contact & Location
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <InfoItem icon={FiPhone} label="Phone" value={school.phone} copyable />
                                    <InfoItem icon={FiMail} label="Email" value={school.email} copyable />
                                    <InfoItem icon={FiGlobe} label="Website" value={school.website} />
                                </div>
                                <div className="space-y-3">
                                    <InfoItem icon={FiMapPin} label="Address" value={school.address} />
                                    <InfoItem icon={FiMapPin} label="City" value={`${school.city}, ${school.state}`} />
                                    <InfoItem icon={FiMapPin} label="Pincode" value={school.pincode} />
                                </div>
                            </div>
                            {/* Quick Facts - moved here from separate card */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <FiGrid className="w-3.5 h-3.5" />
                                    Quick Facts
                                </h4>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Board</p>
                                        <p className="text-sm font-medium text-gray-900">{school.board || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Medium</p>
                                        <p className="text-sm font-medium text-gray-900">{school.medium || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Type</p>
                                        <p className="text-sm font-medium text-gray-900 capitalize">{school.school_type || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Est.</p>
                                        <p className="text-sm font-medium text-gray-900">{school.established_year || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Classes</p>
                                        <p className="text-sm font-medium text-gray-900">{school.low_class && school.high_class ? `${school.low_class} - ${school.high_class}` : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Capacity</p>
                                        <p className="text-sm font-medium text-gray-900">{school.capacity || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Map */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FiMapPin className="w-4 h-4 text-gray-500" />
                                Location
                            </h3>
                            {/* Google Map - full height */}
                            {school.latitude && school.longitude ? (
                                <div className="h-[280px] rounded-lg overflow-hidden border border-gray-200">
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        center={{ lat: parseFloat(school.latitude), lng: parseFloat(school.longitude) }}
                                        zoom={15}
                                        options={{
                                            disableDefaultUI: true,
                                            zoomControl: true,
                                            streetViewControl: false,
                                            mapTypeControl: false,
                                            fullscreenControl: false,
                                        }}
                                    >
                                        <Marker
                                            position={{ lat: parseFloat(school.latitude), lng: parseFloat(school.longitude) }}
                                            title={school.name}
                                        />
                                    </GoogleMap>
                                </div>
                            ) : (
                                <div className="h-[280px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                                    No coordinates available
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'academic' && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 animate-fade-in">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Academic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <EditableField label="Board" value={school.board} fieldKey="board" onSave={handleFieldUpdate} editable={canEdit} />
                        <EditableField label="Medium" value={school.medium} fieldKey="medium" onSave={handleFieldUpdate} editable={canEdit} />
                        <EditableField label="School Type" value={school.school_type} fieldKey="school_type" onSave={handleFieldUpdate} editable={canEdit} />
                        <EditableField label="Established Year" value={school.established_year} fieldKey="established_year" onSave={handleFieldUpdate} editable={canEdit} />
                        <EditableField label="Affiliation Number" value={school.affiliation_number} fieldKey="affiliation_number" onSave={handleFieldUpdate} editable={canEdit} />
                        <EditableField label="UDISE Code" value={school.udise_code} fieldKey="udise_code" onSave={handleFieldUpdate} editable={canEdit} />
                        <EditableField label="Lowest Class" value={school.low_class} fieldKey="low_class" onSave={handleFieldUpdate} editable={canEdit} />
                        <EditableField label="Highest Class" value={school.high_class} fieldKey="high_class" onSave={handleFieldUpdate} editable={canEdit} />
                    </div>
                    {school.streams?.length > 0 && (
                        <div className="mt-6">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Available Streams</p>
                            <div className="flex flex-wrap gap-2">
                                {school.streams.map((stream: string) => (
                                    <FacilityTag key={stream} name={stream} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'infrastructure' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Principal Info */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-gray-500" />
                            Principal / Head
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <EditableField label="Name" value={school.principal_name} fieldKey="principal_name" onSave={handleFieldUpdate} editable={canEdit} />
                            <EditableField label="Email" value={school.principal_email} fieldKey="principal_email" onSave={handleFieldUpdate} editable={canEdit} type="email" />
                            <EditableField label="Phone" value={school.principal_phone} fieldKey="principal_phone" onSave={handleFieldUpdate} editable={canEdit} type="tel" />
                        </div>
                    </div>

                    {/* Capacity & Staff */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Capacity & Staff</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <EditableField label="Student Capacity" value={school.capacity} fieldKey="capacity" onSave={handleFieldUpdate} editable={canEdit} type="number" />
                            <EditableField label="Teacher Count" value={school.teacher_count} fieldKey="teacher_count" onSave={handleFieldUpdate} editable={canEdit} type="number" />
                            <EditableField label="Staff Count" value={school.staff_count} fieldKey="staff_count" onSave={handleFieldUpdate} editable={canEdit} type="number" />
                        </div>
                    </div>

                    {/* Facilities */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Facilities</h3>
                        {school.facilities?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {school.facilities.map((facility: string) => (
                                    <FacilityTag key={facility} name={facility} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No facilities listed</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'features' && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">Feature Management</h3>
                        {!isRootAdmin && <span className="text-xs text-gray-500">Contact support to change features</span>}
                    </div>
                    <FeatureManagement
                        school={school}
                        isRootAdmin={isRootAdmin}
                        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['school', id] })}
                    />
                </div>
            )}

            {activeTab === 'financials' && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 animate-fade-in">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription History</h3>
                    <FinancialsTab schoolId={id!} />
                </div>
            )}

            {activeTab === 'admin' && isRootAdmin && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 animate-fade-in">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Danger Zone</h3>
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <h4 className="text-red-800 font-medium text-sm">Block School Access</h4>
                        <p className="text-red-600 text-xs mt-1 mb-3">
                            Blocking this school will prevent all users from logging in.
                        </p>
                        <button
                            onClick={() => setIsBlockModalOpen(true)}
                            disabled={blockMutation.isPending}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                            {school.is_active ? 'Block School' : 'Unblock School'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <ConfirmationModal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                onConfirm={handleBlockConfirm}
                title={school.is_active ? 'Block School Access' : 'Restore School Access'}
                message={school.is_active
                    ? `Are you sure you want to block ${school.name}?`
                    : `Are you sure you want to restore access for ${school.name}?`
                }
                confirmLabel={school.is_active ? 'Block School' : 'Restore Access'}
                variant={school.is_active ? 'danger' : 'info'}
            />

            <EditSchoolModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                school={school}
            />

            <StorageDetailsModal
                isOpen={isStorageModalOpen}
                onClose={() => setIsStorageModalOpen(false)}
                school={school}
            />
        </div>
    )
}

function FinancialsTab({ schoolId }: { schoolId: string }) {
    const { data: subsData, isLoading } = useQuery({
        queryKey: ['schoolSubscriptions', schoolId],
        queryFn: () => subscriptionsAPI.listSubscriptions({ school: schoolId }),
    })

    const subscriptions = subsData?.data?.results || subsData?.data || []

    if (isLoading) {
        return <div className="text-center py-6 text-sm text-gray-500">Loading...</div>
    }

    if (subscriptions.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm text-gray-500">No subscriptions found</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs font-medium uppercase">
                    <tr>
                        <th className="px-4 py-3">Feature/Plan</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Start</th>
                        <th className="px-4 py-3">End</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {subscriptions.map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{sub.feature_details?.name || 'Standard'}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {sub.is_active ? 'Active' : 'Expired'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{new Date(sub.start_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-600">{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Auto-renew'}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">₹{sub.feature_details?.price || '0'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
