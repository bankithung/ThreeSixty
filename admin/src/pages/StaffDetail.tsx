import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    MdArrowBack,
    MdEdit,
    MdPrint,
    MdPerson,
    MdPhone,
    MdEmail,
    MdLocationOn,
    MdBadge,
    MdCalendarToday,
    MdDirectionsBus,
    MdSchool,
    MdVerified,
    MdWarning,
    MdDescription,
    MdGroup,
    MdWork,
    MdHealthAndSafety,
    MdGavel,
    MdAttachMoney,
    MdAccessTime,
    MdFlag,
    MdFamilyRestroom,
    MdContactPhone,
    MdLanguage,
    MdCreditCard,
    MdCheckCircle,
    MdBlock,
    MdOutlineFileDownload,
    MdOutlineOpenInNew,
    MdLock,
    MdSearch,
    MdFilterList
} from 'react-icons/md'
import toast from 'react-hot-toast'
import { staffAPI, subscriptionsAPI } from '../lib/api'
import ConfirmationModal from '../components/ConfirmationModal'

// --- Types & Helpers ---

const formatDate = (date: string | null | undefined) => {
    if (!date) return '—'
    try {
        return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
        return date
    }
}

// --- Components ---

const DetailItem = ({ label, value, icon: Icon, isLink = false, href = '' }: { label: string, value: any, icon?: any, isLink?: boolean, href?: string }) => (
    <div className="group">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400 transition-colors" />}
            {label}
        </p>
        {isLink && href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline truncate block">
                {value || '—'}
            </a>
        ) : (
            <p className="text-sm font-semibold text-gray-900 truncate">{value || '—'}</p>
        )}
    </div>
)

const SectionHeader = ({ title, icon: Icon, action }: { title: string, icon: any, action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-50 rounded-lg text-primary-600">
                <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h3>
        </div>
        {action}
    </div>
)

const StatusPill = ({ active, text }: { active: boolean, text?: string }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
        active 
        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
        : 'bg-rose-50 text-rose-600 border-rose-100'
    }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
        {text || (active ? 'Active' : 'Inactive')}
    </span>
)

const DocumentRow = ({ title, url, verified, required = false }: { title: string, url?: string, verified?: boolean, required?: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg transition-all group">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${url ? 'bg-white text-primary-600 shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                {url ? <MdDescription className="w-5 h-5" /> : <MdWarning className="w-5 h-5" />}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    {title}
                    {verified && <MdVerified className="w-3.5 h-3.5 text-blue-500" title="Verified" />}
                </p>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${url ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {url ? 'Uploaded' : 'Missing'}
                    </span>
                    {required && !url && <span className="text-[10px] font-bold text-red-500 uppercase">• Required</span>}
                </div>
            </div>
        </div>
        {url && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1.5 bg-white text-gray-500 hover:text-primary-600 border border-gray-200 rounded-md shadow-sm transition-colors"
                    title="View"
                >
                    <MdOutlineOpenInNew className="w-4 h-4" />
                </a>
                <a 
                    href={url} 
                    download
                    className="p-1.5 bg-white text-gray-500 hover:text-primary-600 border border-gray-200 rounded-md shadow-sm transition-colors"
                    title="Download"
                >
                    <MdOutlineFileDownload className="w-4 h-4" />
                </a>
            </div>
        )}
    </div>
)

const StatCard = ({ label, value, subtext, icon: Icon, colorClass = "text-primary-600 bg-primary-50" }: { label: string, value: string | number, subtext?: string, icon: any, colorClass?: string }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
            {subtext && <p className="text-[10px] text-gray-400 font-medium">{subtext}</p>}
        </div>
    </div>
)

// --- Main Component ---

export default function StaffDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [confirmDeactivate, setConfirmDeactivate] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [assignmentSubTab, setAssignmentSubTab] = useState<'bus' | 'students'>('bus')
    const [studentSearch, setStudentSearch] = useState('')
    const [studentYearFilter, setStudentYearFilter] = useState(new Date().getFullYear().toString())

    const { data, isLoading, error } = useQuery({
        queryKey: ['staff', id],
        queryFn: () => staffAPI.get(id!),
        enabled: !!id,
    })

    // Check for Transport Feature
    const { data: subData } = useQuery({
        queryKey: ['mySubscriptions'],
        queryFn: () => subscriptionsAPI.getMySubscriptions(),
    })
    
    // Check if school has bus tracking enabled
    const hasTransportFeature = subData?.data?.features?.some((f: any) => f.code === 'bus_tracking') ?? false

    // Fetch Transport Analytics
    const { data: analyticsData } = useQuery({
        queryKey: ['staffAnalysis', id],
        queryFn: () => staffAPI.getTransportAnalytics(id!),
        enabled: !!id && hasTransportFeature && ['driver', 'conductor'].includes(data?.data?.role),
    })
    
    const analytics = analyticsData?.data?.analytics || {}
    const transportHistory = analyticsData?.data?.history || []

    const deactivateMutation = useMutation({
        mutationFn: () => staffAPI.update(id!, { is_active: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success('Staff member deactivated')
            navigate('/staff')
        },
        onError: () => toast.error('Failed to deactivate'),
    })

    if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>
    if (error || !data?.data) return <div className="p-8 text-center text-red-500">Error loading staff data</div>

    const staff = data.data
    const profile = staff.staff_profile || {}
    const isDriverOrConductor = ['driver', 'conductor'].includes(staff.role)
    const buses = staff.assigned_buses || []
    
    // Derived state
    const roleColors: any = {
        driver: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        conductor: 'bg-teal-100 text-teal-700 border-teal-200',
        teacher: 'bg-violet-100 text-violet-700 border-violet-200',
        school_admin: 'bg-rose-100 text-rose-700 border-rose-200',
        office_staff: 'bg-blue-100 text-blue-700 border-blue-200',
    }
    const roleColor = roleColors[staff.role] || 'bg-gray-100 text-gray-700 border-gray-200'

    const tabs = [
        { id: 'overview', label: 'Overview', icon: MdPerson },
        { id: 'employment', label: 'Employment', icon: MdWork },
        { id: 'documents', label: 'Documents', icon: MdDescription },
        ...(isDriverOrConductor ? [{ id: 'assignments', label: 'Assignments', icon: MdDirectionsBus }] : [])
    ]

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* Top Toolbar */}
            <div className="sticky top-0 bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/staff')} className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all">
                        <MdArrowBack className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-sm">
                            {staff.first_name?.[0]}{staff.last_name?.[0]}
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 leading-none">{staff.full_name}</h1>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-0.5">{staff.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all" title="Print">
                        <MdPrint className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => navigate(`/staff/edit/${id}`)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all shadow-sm"
                    >
                        <MdEdit className="w-3.5 h-3.5" /> Edit
                    </button>
                    {staff.is_active && (
                        <button 
                            onClick={() => setConfirmDeactivate(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 text-sm font-medium rounded-lg transition-all"
                        >
                            <MdBlock className="w-3.5 h-3.5" /> Deactivate
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col md:flex-row w-full p-4 md:p-6 gap-6 items-start">
                
                {/* Left Sidebar: Profile & Key Stats */}
                <div className="w-full md:w-80 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit shrink-0 md:sticky md:top-20">
                    <div className="p-6 text-center border-b border-gray-100">
                        <div className="w-24 h-24 mx-auto bg-gray-100 rounded-2xl mb-4 overflow-hidden relative shadow-inner group">
                            {staff.photo ? (
                                <img src={staff.photo} alt={staff.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <MdPerson className="w-12 h-12 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                            <div className={`absolute bottom-0 inset-x-0 h-1.5 ${staff.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{staff.full_name}</h2>
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${roleColor}`}>
                                {staff.role?.replace('_', ' ')}
                            </span>
                            <StatusPill active={staff.is_active} />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 text-left">
                            <a href={`tel:${staff.phone}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                                <span className="p-1.5 bg-gray-100 text-gray-500 rounded-md group-hover:bg-white group-hover:text-primary-600 transition-colors shadow-sm">
                                    <MdPhone className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-sm font-medium text-gray-700">{staff.phone}</span>
                            </a>
                            <a href={`mailto:${staff.email}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                                <span className="p-1.5 bg-gray-100 text-gray-500 rounded-md group-hover:bg-white group-hover:text-primary-600 transition-colors shadow-sm">
                                    <MdEmail className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-sm font-medium text-gray-700 truncate">{staff.email || 'No email'}</span>
                            </a>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Info</p>
                            <div className="space-y-4">
                                <DetailItem label="Joined" value={formatDate(staff.created_at)} icon={MdCalendarToday} />
                                <DetailItem label="School" value={staff.school_name} icon={MdSchool} />
                                <DetailItem label="Emp Type" value={profile.willing_fulltime ? 'Full Time' : 'Part Time'} icon={MdWork} />
                            </div>
                        </div>

                        {staff.assigned_students && staff.assigned_students.length > 0 && (
                            <div className="bg-primary-50/50 rounded-xl p-4 border border-primary-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <MdGroup className="text-primary-600 w-4 h-4" />
                                    <span className="text-xs font-bold text-primary-700 uppercase">Students</span>
                                </div>
                                <p className="text-2xl font-bold text-primary-900">{staff.assigned_students.length}</p>
                                <p className="text-[10px] text-primary-600 font-medium">Under supervision</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm h-fit">
                    {/* Tabs */}
                    <div className="px-6 pt-4 bg-white border-b border-gray-200 flex gap-6 overflow-x-auto hide-scrollbar rounded-t-2xl">
                        {tabs.map(tab => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative ${
                                        isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Icon className={isActive ? 'w-4 h-4' : 'w-4 h-4 text-gray-400'} />
                                    {tab.label}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full"></div>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Content */}
                    <div className="p-6 lg:p-8">
                        <div className="max-w-4xl space-y-8 pb-12">
                            
                            {/* OVERVIEW CONTENT */}
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-full">
                                        <SectionHeader title="Personal Details" icon={MdPerson} />
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <DetailItem label="Gender" value={profile.gender} />
                                            <DetailItem label="DOB" value={formatDate(profile.date_of_birth)} />
                                            <DetailItem label="Marital Status" value={profile.marital_status} />
                                            <DetailItem label="Nationality" value={profile.nationality} />
                                            <DetailItem label="Father's Name" value={profile.father_name} />
                                            <DetailItem label="Languages" value={profile.languages_known} />
                                            <DetailItem label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : null} />
                                            <DetailItem label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : null} />
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                                        <SectionHeader title="Address" icon={MdLocationOn} />
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Permanent Address</p>
                                                <p className="text-sm text-gray-700 leading-relaxed">{profile.permanent_address || '—'}</p>
                                            </div>
                                            <div className="h-px bg-gray-50"></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Present Address</p>
                                                <p className="text-sm text-gray-700 leading-relaxed">{profile.present_address || '—'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                        <SectionHeader title="Emergency Contact" icon={MdContactPhone} />
                                        <div className="space-y-3">
                                            <DetailItem label="Name" value={profile.emergency_contact_name} icon={MdPerson} />
                                            <DetailItem label="Relation" value={profile.emergency_contact_relation} icon={MdFamilyRestroom} />
                                            <DetailItem label="Phone" value={profile.emergency_contact_phone} icon={MdPhone} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* EMPLOYMENT CONTENT */}
                            {activeTab === 'employment' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <StatCard label="Experience" value={profile.experience_years ? `${profile.experience_years} Years` : '0'} icon={MdWork} />
                                        <StatCard label="Expected Salary" value={`₹${profile.expected_salary || 0}`} icon={MdAttachMoney} colorClass="bg-green-50 text-green-600" />
                                        <StatCard label="Last Salary" value={`₹${profile.last_drawn_salary || 0}`} icon={MdAttachMoney} colorClass="bg-gray-100 text-gray-600" />
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                        <SectionHeader title="Employment Details" icon={MdWork} />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <DetailItem label="Education" value={profile.education} />
                                            <DetailItem label="Available From" value={formatDate(profile.available_start_date)} />
                                            <DetailItem label="Pref. Hours" value={profile.preferred_working_hours} />
                                            <div className="col-span-full">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Previous Employment</p>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm text-gray-600">
                                                    {profile.previous_employment || 'No details provided'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {isDriverOrConductor && (
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                            <SectionHeader title="License Information" icon={MdBadge} />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {staff.role === 'driver' ? (
                                                    <>
                                                        <DetailItem label="License No." value={profile.license_number} />
                                                        <DetailItem label="Class" value={profile.license_class} />
                                                        <DetailItem label="RTA" value={profile.license_rta} />
                                                        <DetailItem label="Issue Date" value={formatDate(profile.license_issue_date)} />
                                                        <DetailItem label="Expiry" value={formatDate(profile.license_expiry_date)} />
                                                        <DetailItem label="Endorsements" value={profile.license_endorsements} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <DetailItem label="Conductor Lic. No." value={profile.conductor_license_number} />
                                                        <DetailItem label="Authority" value={profile.conductor_license_authority} />
                                                        <DetailItem label="Valid Until" value={formatDate(profile.conductor_license_valid_until)} />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DOCUMENTS CONTENT */}
                            {activeTab === 'documents' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                            <SectionHeader title="Identity & Address Proofs" icon={MdBadge} />
                                            <div className="space-y-2">
                                                <DocumentRow title="ID Proof" url={profile.id_proof_document_url} required />
                                                <DocumentRow title="Address Proof" url={profile.address_proof_document_url} required />
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                            <SectionHeader title="Employment Documents" icon={MdWork} />
                                            <div className="space-y-2">
                                                <DocumentRow title="Education Certificate" url={profile.education_certificate_url} />
                                                <DocumentRow title="Experience Certificate" url={profile.experience_certificate_url} />
                                                {isDriverOrConductor && (
                                                    <DocumentRow title="Driving License" url={profile.license_document_url} required />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                            <SectionHeader title="Verification Status" icon={MdVerified} />
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700">Medical Fitness</span>
                                                    <StatusPill active={profile.fitness_confirmed} text={profile.fitness_confirmed ? 'Fit' : 'Pending'} />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700">Police Verification</span>
                                                    <StatusPill active={profile.police_verification_obtained} text={profile.police_verification_obtained ? 'Verified' : 'Pending'} />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700">Criminal Record</span>
                                                    <StatusPill active={profile.no_criminal_record} text={profile.no_criminal_record ? 'Clear' : 'Check Req.'} />
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-gray-50">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Certificates</p>
                                                <div className="space-y-2">
                                                    <DocumentRow title="Medical Cert." url={profile.medical_certificate_url} verified={profile.fitness_confirmed} />
                                                    <DocumentRow title="Police Cert." url={profile.police_verification_certificate_url} verified={profile.police_verification_obtained} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ASSIGNMENTS CONTENT */}
                            {activeTab === 'assignments' && (
                                <div className="space-y-6 animate-fade-in">
                            {/* ASSIGNMENTS CONTENT */}
                            {activeTab === 'assignments' && (
                                <div className="space-y-6 animate-fade-in">
                                    {!hasTransportFeature ? (
                                        <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                                                <MdLock className="w-8 h-8 text-gray-300" />
                                            </div>
                                            
                                            <h3 className="text-lg font-bold text-gray-900 mb-2">Transport Feature Locked</h3>
                                            <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
                                                Upgrade your school's subscription to access Bus Tracking, Driver History, and complete Transport Analytics.
                                            </p>
                                            
                                            <button 
                                                onClick={() => navigate('/settings/billing')}
                                                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-sm hover:shadow-md"
                                            >
                                                View Subscription Plans
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Sub-tabs Navigation */}
                                            <div className="flex items-center gap-2 mb-4 bg-white p-1 rounded-xl border border-gray-100 w-fit">
                                                <button
                                                    onClick={() => setAssignmentSubTab('bus')}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                        assignmentSubTab === 'bus' 
                                                        ? 'bg-primary-50 text-primary-700 shadow-sm' 
                                                        : 'text-gray-500 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Assigned Bus
                                                </button>
                                                <button
                                                    onClick={() => setAssignmentSubTab('students')}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                        assignmentSubTab === 'students' 
                                                        ? 'bg-primary-50 text-primary-700 shadow-sm' 
                                                        : 'text-gray-500 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    Assigned Students
                                                </button>
                                            </div>

                                            {/* ASSIGNED BUS TAB */}
                                            {assignmentSubTab === 'bus' && (
                                                <div className="space-y-6 animate-fade-in">
                                                    {/* ANALYTICS CARDS */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <StatCard 
                                                            label="Total Driving Time" 
                                                            value={analytics.total_driving_minutes ? `${Math.floor(analytics.total_driving_minutes / 60)}h ${analytics.total_driving_minutes % 60}m` : '0h 0m'} 
                                                            icon={MdAccessTime} 
                                                            colorClass="bg-amber-50 text-amber-600" 
                                                        />
                                                        <StatCard 
                                                            label="Total Distance" 
                                                            value={`${analytics.total_distance_km || 0} km`} 
                                                            icon={MdDirectionsBus} 
                                                            colorClass="bg-blue-50 text-blue-600" 
                                                        />
                                                        <StatCard 
                                                            label="Trips Completed" 
                                                            value={analytics.trip_count || 0} 
                                                            icon={MdCheckCircle} 
                                                            colorClass="bg-emerald-50 text-emerald-600" 
                                                        />
                                                    </div>

                                                    {/* CURRENT ASSIGNMENT */}
                                                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                                        <SectionHeader title="Current Assignment" icon={MdDirectionsBus} />
                                                        {buses.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {buses.map((bus: any) => (
                                                                    <div key={bus.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                                                                        <div className="p-3 bg-white border border-gray-200 rounded-lg text-primary-600">
                                                                            <MdDirectionsBus className="w-6 h-6" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-bold text-gray-900">Bus #{bus.number}</h4>
                                                                            <p className="text-xs text-gray-500">{bus.registration}</p>
                                                                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{bus.capacity} Seats</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 italic">No bus currently assigned.</p>
                                                        )}
                                                    </div>

                                                    {/* ASSIGNMENT HISTORY (Simplified for Bus Tab) */}
                                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                                        <div className="p-5 border-b border-gray-100">
                                                            <SectionHeader title="Bus Assignment History" icon={MdCalendarToday} />
                                                        </div>
                                                        
                                                        {transportHistory.length > 0 ? (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-gray-50/50 text-xs uppercase text-gray-400 font-semibold border-b border-gray-100">
                                                                        <tr>
                                                                            <th className="px-5 py-3">Academic Year</th>
                                                                            <th className="px-5 py-3">Bus</th>
                                                                            <th className="px-5 py-3">Role</th>
                                                                            <th className="px-5 py-3">Period</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-50 text-sm">
                                                                        {transportHistory.map((item: any, idx: number) => (
                                                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                                                <td className="px-5 py-3 font-medium text-gray-900">{item.academic_year}</td>
                                                                                <td className="px-5 py-3 text-gray-600">Bus #{item.bus_number}</td>
                                                                                <td className="px-5 py-3">
                                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                                        item.role === 'Driver' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'
                                                                                    }`}>
                                                                                        {item.role}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-5 py-3 text-gray-500 text-xs">
                                                                                    {formatDate(item.start_date)} - {item.end_date ? formatDate(item.end_date) : 'Present'}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="p-8 text-center text-gray-400 text-sm">
                                                                No history available yet.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ASSIGNED STUDENTS TAB */}
                                            {assignmentSubTab === 'students' && (
                                                <div className="space-y-6 animate-fade-in">
                                                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                            <SectionHeader title="Student List" icon={MdGroup} />
                                                            
                                                            <div className="flex items-center gap-2">
                                                                {/* Year Filter */}
                                                                <div className="relative">
                                                                    <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                                    <select
                                                                        value={studentYearFilter}
                                                                        onChange={(e) => setStudentYearFilter(e.target.value)}
                                                                        className="h-10 pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                                                                    >
                                                                        {/* Generate year options dynamically or from history */}
                                                                        {[new Date().getFullYear().toString(), ...Array.from(new Set(transportHistory.map((h: any) => h.academic_year)))].filter((v, i, a) => a.indexOf(v) === i).sort().reverse().map((year: any) => (
                                                                            <option key={year} value={year}>{year}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                {/* Search */}
                                                                <div className="relative">
                                                                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search students..."
                                                                        value={studentSearch}
                                                                        onChange={(e) => setStudentSearch(e.target.value)}
                                                                        className="h-10 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-48"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Students Table */}
                                                        {(() => {
                                                            // Logic to combine current students (if current year) and history students
                                                            const currentYear = new Date().getFullYear().toString()
                                                            let studentsList: any[] = []

                                                            if (studentYearFilter === currentYear) {
                                                                // Use current assignments
                                                                studentsList = staff.assigned_students || []
                                                            } else {
                                                                // Use history data for that year
                                                                const historyRecord = transportHistory.find((h: any) => h.academic_year === studentYearFilter)
                                                                studentsList = historyRecord?.students || []
                                                            }

                                                            // Filter by search
                                                            const filteredStudents = studentsList.filter((s: any) => 
                                                                (s.full_name || s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                                (s.admission_number || '').toLowerCase().includes(studentSearch.toLowerCase())
                                                            )

                                                            if (filteredStudents.length === 0) {
                                                                return (
                                                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                                        <MdGroup className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                                        <p className="text-gray-500 font-medium">No students found for this filter.</p>
                                                                    </div>
                                                                )
                                                            }

                                                            return (
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-left border-collapse">
                                                                        <thead className="bg-gray-50/50 text-xs uppercase text-gray-400 font-semibold border-b border-gray-100">
                                                                            <tr>
                                                                                <th className="px-4 py-3">Student</th>
                                                                                <th className="px-4 py-3">ID Number</th>
                                                                                <th className="px-4 py-3 text-right">Action</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-50 text-sm">
                                                                            {filteredStudents.map((s: any, idx: number) => (
                                                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                                                                    <td className="px-4 py-3">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                                                                                {s.photo ? (
                                                                                                    <img src={s.photo} alt={s.name || s.full_name} className="w-full h-full object-cover" />
                                                                                                ) : (
                                                                                                    <MdPerson className="w-full h-full p-1.5 text-gray-400" />
                                                                                                )}
                                                                                            </div>
                                                                                            <span className="font-medium text-gray-900">{s.name || s.full_name}</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.admission_number || '—'}</td>
                                                                                    <td className="px-4 py-3 text-right">
                                                                                        <button 
                                                                                            onClick={() => s.id && navigate(`/students/${s.id}`)}
                                                                                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                                            title="View Profile"
                                                                                        >
                                                                                            <MdOutlineOpenInNew className="w-4 h-4" />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmDeactivate}
                onClose={() => setConfirmDeactivate(false)}
                onConfirm={() => deactivateMutation.mutate()}
                title="Deactivate Staff Account"
                message={`Are you sure you want to deactivate ${staff.full_name}?`}
                confirmLabel="Deactivate"
                variant="danger"
                isLoading={deactivateMutation.isPending}
            />
        </div>
    )
}
