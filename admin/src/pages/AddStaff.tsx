
import React, { useState, useEffect, forwardRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { 
    FiArrowLeft, FiUpload, FiTruck, FiUser, FiAlertCircle, FiChevronRight, FiChevronLeft, FiCheck, FiLock, FiActivity, FiBriefcase, FiDollarSign, FiRepeat, FiMapPin, FiTag, FiFile, FiX, FiEye, FiEdit2, FiEyeOff, FiExternalLink
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { staffAPI, accountsAPI, schoolsAPI, authAPI } from '../lib/api'
import { compressImage } from '../utils/imageCompression'

function formatBackendError(err: any): string {
    if (!err) return 'Failed to create staff member'
    if (typeof err === 'string') return err

    // Common API shape: { message: "..." }
    if (typeof err.message === 'string' && err.message.trim()) return err.message

    // DRF ValidationError shape: { field: ["msg1", "msg2"], non_field_errors: [...] }
    if (typeof err === 'object') {
        const parts: string[] = []
        for (const [key, value] of Object.entries(err)) {
            if (value == null) continue

            const label = key === 'non_field_errors'
                ? 'Error'
                : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

            const msgs = Array.isArray(value)
                ? value.map(String)
                : [String(value)]

            for (const m of msgs) {
                const msg = m.trim()
                if (!msg) continue
                parts.push(`${label}: ${msg}`)
            }
        }
        if (parts.length) return parts.join('\n')
    }

    return 'Failed to create staff member'
}

// Form Types
type StaffFormData = {
    school_id: string
    role: string
    first_name: string
    last_name: string
    father_name: string
    gender: string
    dob: string
    marital_status: string
    nationality: string
    phone: string
    email: string
    permanent_address: string
    present_address: string
    photo: File | null
    emergency_name: string
    emergency_relation: string
    emergency_phone: string
    id_type: string
    id_number: string
    languages: string
    license_number?: string
    license_class?: string
    license_rta?: string
    license_issue?: string
    license_expiry?: string
    endorsements?: string
    conductor_license?: string
    license_authority?: string
    license_valid?: string
    education: string
    experience_years: string
    prev_employment: string
    training: string
    height: string
    weight: string
    vision: string
    medical_history: string
    fitness_confirmed: boolean
    police_verified: boolean
    no_criminal_record: boolean
    start_date: string
    working_hours: string
    last_salary: string
    expected_salary: string
    fulltime: boolean
    understands_duties: boolean
    password?: string
    confirm_password?: string
    fitness_doc?: File | null
    police_doc?: File | null
    criminal_doc?: File | null
}

const EMERGENCY_RELATION_OPTIONS = [
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'guardian', label: 'Guardian' },
    { value: 'relative', label: 'Relative' },
    { value: 'other', label: 'Other' },
]

// Short but reasonably complete list – can be extended easily
const NATIONALITY_OPTIONS = [
    'Indian',
    'Afghan',
    'American',
    'Australian',
    'Bangladeshi',
    'Brazilian',
    'British',
    'Canadian',
    'Chinese',
    'Dutch',
    'French',
    'German',
    'Indonesian',
    'Italian',
    'Japanese',
    'Kenyan',
    'Malaysian',
    'Nepalese',
    'Nigerian',
    'Pakistani',
    'Russian',
    'Saudi',
    'Singaporean',
    'South African',
    'Sri Lankan',
    'Swiss',
    'Thai',
    'UAE',
    'Vietnamese',
]

const LANGUAGE_OPTIONS = [
    'English',
    'Hindi',
    'Assamese',
    'Bengali',
    'Gujarati',
    'Kannada',
    'Konkani',
    'Malayalam',
    'Manipuri',
    'Marathi',
    'Mizo',
    'Nagamese',
    'Odia',
    'Punjabi',
    'Tamil',
    'Telugu',
    'Urdu',
    'Other',
]

// Step definitions
const STEPS = [
    { id: 'personal', title: 'Personal Details', icon: FiUser },
    { id: 'professional', title: 'Credentials', icon: FiBriefcase },
    { id: 'employment', title: 'Employment', icon: FiDollarSign },
    { id: 'health', title: 'Health & Safety', icon: FiActivity },
    { id: 'review', title: 'Review & Confirm', icon: FiEye },
]

export default function AddStaff() {
    const navigate = useNavigate()
    const { id: staffId } = useParams<{ id: string }>()
    const isEditMode = !!staffId
    const queryClient = useQueryClient()
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [idProofFile, setIdProofFile] = useState<File | null>(null)
    const [addressProofFile, setAddressProofFile] = useState<File | null>(null)
    const [educationFile, setEducationFile] = useState<File | null>(null)
    const [experienceFile, setExperienceFile] = useState<File | null>(null)
    const [licenseFile, setLicenseFile] = useState<File | null>(null)
    const [medicalFile, setMedicalFile] = useState<File | null>(null)
    const [policeFile, setPoliceFile] = useState<File | null>(null)
    const [criminalFile, setCriminalFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
    
    // State for existing document URLs (edit mode)
    const [existingDocs, setExistingDocs] = useState<{
        fitness_doc?: string
        police_doc?: string
        criminal_doc?: string
        id_proof?: string
        address_proof?: string
        license_doc?: string
    }>({})

    // Queries
    const { data: userProfile } = useQuery({
        queryKey: ['me'],
        queryFn: () => authAPI.getProfile(),
        retry: false
    })
    const userRole = userProfile?.data?.role || 'admin' 

    const { data: schoolsData } = useQuery({
        queryKey: ['schools'],
        queryFn: () => schoolsAPI.list(),
        enabled: userRole === 'root_admin'
    })
    
    const { data: userSchoolsData } = useQuery({
        queryKey: ['userSchools'],
        queryFn: () => accountsAPI.getUserSchools(),
        enabled: userRole !== 'root_admin'
    })

    const schools = schoolsData?.data?.results || schoolsData?.data || []
    const userSchools = userSchoolsData?.data?.results || userSchoolsData?.data || []

    // Fetch existing staff data when in edit mode
    const { data: existingStaffData, isLoading: isLoadingStaff } = useQuery({
        queryKey: ['staff', staffId],
        queryFn: () => staffAPI.get(staffId!),
        enabled: isEditMode && !!staffId
    })
    const existingStaff = existingStaffData?.data || existingStaffData
    
    // Get current school data for display
    const getCurrentSchool = () => {
        if (userRole === 'root_admin') {
            const schoolId = watch('school_id')
            const school = schools.find((s: any) => s.id === schoolId)
            return { name: school?.name || 'Select a school', logo: school?.logo }
        } else {
            const membership = userSchools[0]
            if (!membership) return { name: 'No school assigned', logo: null }
            // API returns school_name and school_logo directly from SchoolMembershipSerializer
            return { 
                name: membership.school_name || membership.school?.name || 'Unknown School', 
                logo: membership.school_logo || null 
            }
        }
    }
    
    const currentSchool = getCurrentSchool()

    const { register, handleSubmit, watch, setValue, getValues, formState: { errors }, trigger } = useForm<StaffFormData>({
        defaultValues: {
            nationality: 'Indian',
            fitness_confirmed: false,
            police_verified: false,
            no_criminal_record: false,
            fulltime: true,
            id_type: 'aadhar',
            vision: 'normal'
        }
    })

    // Register file fields manually so they are available in data/getValues
    useEffect(() => {
        register('fitness_doc')
        register('police_doc')
        register('criminal_doc')
    }, [register])

    // Auto-select school for non-root admins
    useEffect(() => {
        if (userRole !== 'root_admin' && userSchools.length > 0) {
            const school = userSchools[0].school
            const schoolId = typeof school === 'object' ? school.id : school
            setValue('school_id', schoolId)
        }
    }, [userSchools, userRole, setValue])

    // Pre-fill form when editing existing staff
    useEffect(() => {
        if (isEditMode && existingStaff) {
            console.log('📦 Edit Mode - Existing Staff Data:', existingStaff)
            console.log('📦 Staff Profile:', existingStaff.staff_profile)
            
            // Set role first
            setSelectedRole(existingStaff.role)
            
            // Get nested staff_profile data (from StaffDetailSerializer)
            const profile = existingStaff.staff_profile || {}
            
            // Pre-fill school
            if (existingStaff.school_id || existingStaff.school) {
                setValue('school_id', existingStaff.school_id || existingStaff.school)
            }
            
            // User level fields
            if (existingStaff.first_name) setValue('first_name', existingStaff.first_name)
            if (existingStaff.last_name) setValue('last_name', existingStaff.last_name)
            if (existingStaff.phone) setValue('phone', existingStaff.phone)
            if (existingStaff.email) setValue('email', existingStaff.email)
            
            // Personal fields from staff_profile
            if (profile.father_name) setValue('father_name', profile.father_name)
            if (profile.gender) setValue('gender', profile.gender)
            if (profile.marital_status) setValue('marital_status', profile.marital_status)
            if (profile.nationality) setValue('nationality', profile.nationality)
            if (profile.permanent_address) setValue('permanent_address', profile.permanent_address)
            if (profile.present_address) setValue('present_address', profile.present_address)
            
            // Emergency contact from staff_profile
            if (profile.emergency_contact_name) setValue('emergency_name', profile.emergency_contact_name)
            if (profile.emergency_contact_relation) setValue('emergency_relation', profile.emergency_contact_relation)
            if (profile.emergency_contact_phone) setValue('emergency_phone', profile.emergency_contact_phone)
            
            // Identification from staff_profile
            if (profile.id_type) setValue('id_type', profile.id_type)
            if (profile.id_number) setValue('id_number', profile.id_number)
            
            // Driver license fields from staff_profile
            if (profile.license_number) setValue('license_number', profile.license_number)
            if (profile.license_class) setValue('license_class', profile.license_class)
            if (profile.license_rta) setValue('license_rta', profile.license_rta)
            if (profile.license_issue_date) setValue('license_issue', profile.license_issue_date)
            if (profile.license_expiry_date) setValue('license_expiry', profile.license_expiry_date)
            if (profile.license_endorsements) setValue('endorsements', profile.license_endorsements)
            
            // Conductor license fields from staff_profile
            if (profile.conductor_license_number) setValue('conductor_license', profile.conductor_license_number)
            if (profile.conductor_license_authority) setValue('license_authority', profile.conductor_license_authority)
            if (profile.conductor_license_valid_until) setValue('license_valid', profile.conductor_license_valid_until)
            
            // Employment from staff_profile
            if (profile.experience_years != null) setValue('experience_years', String(profile.experience_years))
            if (profile.preferred_working_hours) setValue('working_hours', profile.preferred_working_hours)
            if (profile.last_drawn_salary) setValue('last_salary', profile.last_drawn_salary)
            if (profile.expected_salary) setValue('expected_salary', profile.expected_salary)
            if (profile.education) setValue('education', profile.education)
            if (profile.previous_employment) setValue('prev_employment', profile.previous_employment)
            if (profile.professional_training) setValue('training', profile.professional_training)
            
            // Health from staff_profile
            if (profile.height_cm) setValue('height', String(profile.height_cm))
            if (profile.weight_kg) setValue('weight', String(profile.weight_kg))
            if (profile.vision_status) setValue('vision', profile.vision_status)
            if (profile.medical_history) setValue('medical_history', profile.medical_history)
            
            // Date fields
            if (profile.date_of_birth) setValue('dob', profile.date_of_birth)
            if (profile.available_start_date) setValue('start_date', profile.available_start_date)
            
            // Boolean fields from staff_profile
            setValue('fulltime', profile.willing_fulltime !== false)
            setValue('fitness_confirmed', !!profile.fitness_confirmed)
            setValue('police_verified', !!profile.police_verification_obtained)
            setValue('no_criminal_record', profile.no_criminal_record !== false)
            
            // Languages from staff_profile
            if (profile.languages_known) {
                const langs = profile.languages_known.split(',').map((l: string) => l.trim()).filter(Boolean)
                setSelectedLanguages(langs)
            }
            
            // Set photo preview - use URL from serializer
            if (existingStaff.photo) {
                setPreview(existingStaff.photo)
            } else if (profile.photo_url) {
                setPreview(profile.photo_url)
            }
            
            // Set existing document URLs for display
            setExistingDocs({
                fitness_doc: profile.medical_certificate_url,
                police_doc: profile.police_verification_certificate_url,
                criminal_doc: profile.criminal_record_certificate_url,
                id_proof: profile.id_proof_document_url,
                address_proof: profile.address_proof_document_url,
                license_doc: profile.license_document_url,
            })
        }
    }, [isEditMode, existingStaff, setValue])

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            try {
                const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 })
                setPhotoFile(compressed)
                setPreview(URL.createObjectURL(compressed))
            } catch (err) {
                console.error('Compression failed', err)
                toast.error('Failed to process image')
            }
        }
    }

    const onSubmit = async (data: StaffFormData) => {
        if (!selectedRole) {
            toast.error('Please select a role')
            return
        }

        // Final guard: required verification documents (skip for edit mode if docs already exist)
        if (!isEditMode) {
            if (!data.fitness_confirmed || !data.fitness_doc || !data.police_verified || !data.police_doc || !data.no_criminal_record || !data.criminal_doc) {
                toast.error('Please complete and upload all verification documents before submitting.')
                setCurrentStep(3)
                return
            }
        }

        setIsSubmitting(true)
        try {
            const formData = new FormData()
            
            // Fields to exclude from automatic processing
            const excludeFields = ['photo', 'fitness_doc', 'police_doc', 'criminal_doc', 'confirm_password']
            
            // Add all form fields except files and empty values
            Object.entries(data).forEach(([key, value]) => {
                if (excludeFields.includes(key)) return
                if (value === undefined || value === null) return

                // Avoid sending whitespace-only strings (common cause of "invalid email" etc.)
                if (typeof value === 'string') {
                    const trimmed = value.trim()
                    if (trimmed === '') return
                    formData.append(key, trimmed)
                    return
                }

                // Booleans / numbers etc.
                formData.append(key, value.toString())
            })
            
            formData.append('role', selectedRole)
            
            // Add photo if exists (new upload or change)
            if (photoFile) {
                formData.append('photo', photoFile)
            }
            
            // Add document files
            if (idProofFile) formData.append('id_proof_document', idProofFile)
            if (addressProofFile) formData.append('address_proof_document', addressProofFile)
            if (educationFile) formData.append('education_certificate', educationFile)
            if (experienceFile) formData.append('experience_certificate', experienceFile)
            if (licenseFile) formData.append('license_document', licenseFile)
            
            // Verification documents (check both state and form data from VerificationCard for backward compatibility)
            // Verification documents (check both state and form data from VerificationCard for backward compatibility)
            // We use getValues() as fallback because manual setValue on registered fields might not pass through data if they were not marked dirty/touched correctly
            const medicalDoc = medicalFile || data.fitness_doc || getValues('fitness_doc')
            if (medicalDoc instanceof File) formData.append('medical_certificate', medicalDoc)

            const policeDoc = policeFile || data.police_doc || getValues('police_doc')
            if (policeDoc instanceof File) formData.append('police_verification_certificate', policeDoc)

            const criminalDoc = criminalFile || data.criminal_doc || getValues('criminal_doc')
            if (criminalDoc instanceof File) formData.append('criminal_record_certificate', criminalDoc)

            if (isEditMode && staffId) {
                // Update existing staff
                await staffAPI.update(staffId, formData)
                toast.success('Staff member updated successfully!')
            } else {
                // Create new staff
                await staffAPI.create(formData)
                toast.success('Staff member added successfully!')
            }
            
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            navigate('/staff')
        } catch (error: any) {
            console.error(error)
            // Show the real backend validation error (DRF often returns field-level errors)
            const backend = error?.response?.data
            if (backend) {
                console.error('Backend error data:', backend)
                toast.error(formatBackendError(backend), { duration: 6000 })
            } else {
                toast.error(isEditMode ? 'Failed to update staff member' : 'Failed to create staff member', { duration: 6000 })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Step Navigation
    const handleNext = async () => {
        let fieldsToValidate: (keyof StaffFormData)[] = []

        if (currentStep === 0) {
            fieldsToValidate = ['school_id', 'first_name', 'phone', 'gender', 'dob']
        } else if (currentStep === 1) {
            fieldsToValidate = ['id_type', 'id_number', 'nationality']
            if (selectedRole === 'driver') {
                fieldsToValidate.push('license_number', 'license_class', 'license_rta', 'license_issue', 'license_expiry')
            } else {
                fieldsToValidate.push('conductor_license', 'license_authority', 'license_valid')
            }
        } else if (currentStep === 2) {
            fieldsToValidate = ['password', 'confirm_password']
        } else if (currentStep === 3) {
            // Manual validation for verification documents
            const hasAllDocs =
                watch('fitness_confirmed') &&
                (watch('fitness_doc') || existingDocs.fitness_doc) &&
                watch('police_verified') &&
                (watch('police_doc') || existingDocs.police_doc) &&
                watch('no_criminal_record') &&
                (watch('criminal_doc') || existingDocs.criminal_doc)

            if (!hasAllDocs) {
                toast.error('Please mark and upload all verification documents before continuing.')
                return
            }
        }

        const isValid = await trigger(fieldsToValidate)
        if (!isValid) return

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const roles = [
        { id: 'driver', name: 'Driver', icon: FiTruck, color: 'bg-orange-50 border-orange-200 text-orange-600', description: 'Bus Driver' },
        { id: 'conductor', name: 'Conductor', icon: FiUser, color: 'bg-green-50 border-green-200 text-green-600', description: 'Bus Attendant' },
        { id: 'teacher', name: 'Teacher', icon: FiUser, color: 'bg-blue-50 border-blue-200 text-blue-600', disabled: true },
        { id: 'principal', name: 'Principal', icon: FiUser, color: 'bg-purple-50 border-purple-200 text-purple-600', disabled: true },
        { id: 'vice_principal', name: 'Vice Principal', icon: FiUser, color: 'bg-indigo-50 border-indigo-200 text-indigo-600', disabled: true },
        { id: 'office_staff', name: 'Office Staff', icon: FiUser, color: 'bg-cyan-50 border-cyan-200 text-cyan-600', disabled: true },
        { id: 'accountant', name: 'Accountant', icon: FiUser, color: 'bg-teal-50 border-teal-200 text-teal-600', disabled: true },
        { id: 'librarian', name: 'Librarian', icon: FiUser, color: 'bg-amber-50 border-amber-200 text-amber-600', disabled: true },
        { id: 'nurse', name: 'Nurse', icon: FiUser, color: 'bg-pink-50 border-pink-200 text-pink-600', disabled: true },
        { id: 'security', name: 'Security', icon: FiUser, color: 'bg-slate-50 border-slate-200 text-slate-600', disabled: true },
        { id: 'helper', name: 'Helper', icon: FiUser, color: 'bg-stone-50 border-stone-200 text-stone-600', disabled: true },
        { id: 'supervisor', name: 'Supervisor', icon: FiUser, color: 'bg-rose-50 border-rose-200 text-rose-600', disabled: true },
    ]

    const activeRole = roles.find(r => r.id === selectedRole)

    return (
        <div className="w-full max-w-5xl mx-auto pb-24 animate-fade-in px-4 sm:px-6">
            {/* Header */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/staff')}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}</h1>
                        <p className="text-xs text-gray-500">{isEditMode ? 'Update staff member details' : 'Register new staff, drivers, and conductors'}</p>
                    </div>
                </div>

                {/* Change Role Button - Compact */}
                {selectedRole && activeRole && (
                    <button 
                        type="button" 
                        onClick={() => { setSelectedRole(null); setCurrentStep(0) }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm text-sm ${activeRole.color}`}
                    >
                        <activeRole.icon className="w-4 h-4" />
                        <span className="font-semibold">{activeRole.name}</span>
                        <FiRepeat className="w-3.5 h-3.5 opacity-50" />
                    </button>
                )}
            </div>

            {/* Role Selection */}
            {!selectedRole ? (
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Select Role to Continue</h2>
                    <p className="text-sm text-gray-500 mb-8">Choose the type of staff member you want to add</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                disabled={role.disabled}
                                onClick={() => !role.disabled && setSelectedRole(role.id)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 relative group
                                    ${role.disabled 
                                        ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' 
                                        : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 bg-white border-gray-100 hover:border-primary-300'
                                    }
                                `}
                            >
                                <div className={`p-3 rounded-xl ${role.disabled ? 'bg-gray-100 text-gray-400' : role.color}`}>
                                    <role.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900">{role.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{role.disabled ? 'Coming Soon' : role.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <form onSubmit={(e) => e.preventDefault()}>
                    {/* Step Indicator - Compact */}
                    <div className="bg-white rounded-lg border border-gray-100 p-3 mb-4">
                        <div className="flex items-center justify-between">
                            {STEPS.map((step, index) => {
                                const isActive = index === currentStep
                                const isCompleted = index < currentStep
                                const StepIcon = step.icon
                                
                                return (
                                    <div key={step.id} className="flex items-center flex-1">
                                        <button
                                            type="button"
                                            onClick={() => index < currentStep && setCurrentStep(index)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                                                isActive 
                                                    ? 'bg-primary-50 text-primary-700 font-bold' 
                                                    : isCompleted
                                                        ? 'text-green-600 hover:bg-green-50 cursor-pointer'
                                                        : 'text-gray-400'
                                            }`}
                                        >
                                            <div className={`p-1 rounded ${
                                                isActive ? 'bg-primary-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                                            }`}>
                                                {isCompleted ? <FiCheck className="w-3 h-3" /> : <StepIcon className="w-3 h-3" />}
                                            </div>
                                            <span className="hidden sm:inline">{step.title}</span>
                                        </button>
                                        {index < STEPS.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-1 ${index < currentStep ? 'bg-green-300' : 'bg-gray-200'}`} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Active Step Content */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
                        <div className="p-6 sm:p-8 relative">
                            {/* Step 0: Personal Details */}
                            {currentStep === 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                            <FiUser className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Personal Details</h2>
                                            <p className="text-sm text-gray-500">Basic information about the staff member</p>
                                        </div>
                                    </div>

                                    {/* Photo + School Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Photo Upload */}
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                            <div className="relative w-16 h-16 shrink-0">
                                                {preview ? (
                                                    <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-white shadow-md" />
                                                ) : (
                                                    <div className="w-full h-full bg-white rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                                                        <FiUser size={24} />
                                                    </div>
                                                )}
                                                <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 shadow-lg">
                                                    <FiUpload size={12} />
                                                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                                                </label>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">Profile Photo</p>
                                                <p className="text-xs text-gray-500">Upload a clear photo</p>
                                            </div>
                                        </div>

                                        {/* School - Side by side with Photo */}
                                        <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
                                            <div className="w-12 h-12 shrink-0 rounded-xl bg-white border border-primary-200 flex items-center justify-center overflow-hidden">
                                                {currentSchool.logo ? (
                                                    <img src={currentSchool.logo} alt="School" className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-xl font-bold text-primary-600">{currentSchool.name?.charAt(0) || 'S'}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Assigned School</p>
                                                <p className="text-sm font-semibold text-gray-900 truncate">{currentSchool.name}</p>
                                            </div>
                                            {userRole === 'root_admin' && (
                                                <button 
                                                    type="button" 
                                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                                    onClick={() => {/* Could open school selector */}}
                                                >
                                                    Change
                                                </button>
                                            )}
                                            <input type="hidden" {...register('school_id')} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        
                                        <FormInput label="First Name" required {...register('first_name', { required: 'Required' })} error={errors.first_name?.message} placeholder="Enter first name" />
                                        <FormInput label="Last Name" {...register('last_name')} placeholder="Enter last name" />
                                        <FormInput label="Father's / Spouse Name" {...register('father_name')} placeholder="Enter name" />
                                        <FormSelect 
                                            label="Gender" 
                                            required
                                            {...register('gender', { required: 'Required' })}
                                            value={watch('gender')}
                                            options={[
                                                { value: 'male', label: 'Male' },
                                                { value: 'female', label: 'Female' },
                                                { value: 'other', label: 'Other' }
                                            ]}
                                            error={errors.gender?.message}
                                        />
                                        <FormInput label="Date of Birth" type="date" required {...register('dob', { required: 'Required' })} error={errors.dob?.message} />
                                        <FormInput
                                            label="Phone Number"
                                            type="tel"
                                            required
                                            {...register('phone', {
                                                required: 'Required',
                                                pattern: {
                                                    value: /^\+?\d{10,15}$/,
                                                    message: 'Enter a valid phone number',
                                                },
                                            })}
                                            error={errors.phone?.message}
                                            placeholder="+91 9876543210"
                                        />
                                        <FormInput
                                            label="Email Address"
                                            type="email"
                                            {...register('email', {
                                                validate: (val) => {
                                                    const trimmed = (val || '').trim()
                                                    if (!trimmed) return true // optional
                                                    // Very small sanity check; backend will still enforce full validation
                                                    return /\S+@\S+\.\S+/.test(trimmed) || 'Enter a valid email address'
                                                }
                                            })}
                                            error={errors.email?.message}
                                            placeholder="email@example.com"
                                        />
                                    </div>

                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <FiAlertCircle className="text-red-500" /> Emergency Contact
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <FormInput label="Contact Name" {...register('emergency_name')} placeholder="Full name" />
                                            <FormSelect
                                                label="Relation"
                                                {...register('emergency_relation')}
                                                value={watch('emergency_relation')}
                                                options={EMERGENCY_RELATION_OPTIONS}
                                            />
                                            <FormInput
                                                label="Phone"
                                                type="tel"
                                                {...register('emergency_phone', {
                                                    pattern: {
                                                        value: /^\+?\d{10,15}$/,
                                                        message: 'Enter a valid phone number',
                                                    },
                                                })}
                                                error={errors.emergency_phone?.message}
                                                placeholder="+91 9876543210"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Professional Credentials */}
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                            <FiBriefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Professional Credentials</h2>
                                            <p className="text-sm text-gray-500">ID documents and license information</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormSelect 
                                            label="ID Document Type" 
                                            required
                                            {...register('id_type', { required: 'Required' })}
                                            value={watch('id_type')}
                                            options={[
                                                { value: 'aadhar', label: 'Aadhar Card' },
                                                { value: 'voter', label: 'Voter ID' },
                                                { value: 'license', label: 'Driving License' },
                                                { value: 'pan', label: 'PAN Card' }
                                            ]}
                                            error={errors.id_type?.message}
                                        />
                                        <FormInput
                                            label="ID Number"
                                            required
                                            {...register('id_number', { required: 'Required' })}
                                            error={errors.id_number?.message}
                                            placeholder="XXXX-XXXX-XXXX"
                                        />
                                        <FormSelect
                                            label="Nationality"
                                            required
                                            {...register('nationality', { required: 'Required' })}
                                            value={watch('nationality')}
                                            options={NATIONALITY_OPTIONS.map((n) => ({ value: n, label: n }))}
                                            error={errors.nationality?.message}
                                        />
                                        <LanguagesMultiSelect
                                            label="Languages Known"
                                            selected={selectedLanguages}
                                            onChange={(langs) => {
                                                setSelectedLanguages(langs)
                                                setValue('languages', langs.join(', '), { shouldValidate: true })
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                                        <div className="w-full">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">ID Proof Document (PDF/Image)</label>
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center justify-center px-4 py-2.5 bg-white border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-primary-500 hover:text-primary-600 transition-all text-sm text-gray-500">
                                                    <FiUpload className="w-4 h-4 mr-2" />
                                                    {idProofFile ? 'Change File' : 'Upload ID Proof'}
                                                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => {
                                                        if (e.target.files?.[0]) setIdProofFile(e.target.files[0])
                                                    }} />
                                                </label>
                                                {idProofFile ? (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                                                        <span className="truncate max-w-[150px]">{idProofFile.name}</span>
                                                        <button type="button" onClick={() => setIdProofFile(null)} className="p-1 hover:bg-blue-100 rounded-full text-blue-500">
                                                            <FiX className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : existingDocs.id_proof ? (
                                                    <a href={existingDocs.id_proof} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
                                                        <FiCheck className="w-3 h-3" />
                                                        <span>Uploaded</span>
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Proof Document (PDF/Image)</label>
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center justify-center px-4 py-2.5 bg-white border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-primary-500 hover:text-primary-600 transition-all text-sm text-gray-500">
                                                    <FiUpload className="w-4 h-4 mr-2" />
                                                    {addressProofFile ? 'Change File' : 'Upload Address Proof'}
                                                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => {
                                                        if (e.target.files?.[0]) setAddressProofFile(e.target.files[0])
                                                    }} />
                                                </label>
                                                {addressProofFile ? (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                                                        <span className="truncate max-w-[150px]">{addressProofFile.name}</span>
                                                        <button type="button" onClick={() => setAddressProofFile(null)} className="p-1 hover:bg-blue-100 rounded-full text-blue-500">
                                                            <FiX className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : existingDocs.address_proof ? (
                                                    <a href={existingDocs.address_proof} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
                                                        <FiCheck className="w-3 h-3" />
                                                        <span>Uploaded</span>
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            {selectedRole === 'driver' ? <><FiTruck className="text-orange-500" /> Driving License Details</> : <><FiTag className="text-green-500" /> Conductor License Details</>}
                                        </h3>
                                        {selectedRole === 'driver' ? (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                                    <FormInput
                                                        label="License Number"
                                                        required
                                                        {...register('license_number', { required: 'Required' })}
                                                        error={errors.license_number?.message}
                                                        placeholder="DL-XXXXXXXXXX"
                                                    />
                                                    <FormInput
                                                        label="License Class"
                                                        required
                                                        {...register('license_class', { required: 'Required' })}
                                                        error={errors.license_class?.message}
                                                        placeholder="LMV / HMV"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <FormInput
                                                        label="RTA (Authority)"
                                                        required
                                                        {...register('license_rta', { required: 'Required' })}
                                                        error={errors.license_rta?.message}
                                                        placeholder="RTA Office"
                                                    />
                                                    <FormInput
                                                        label="Issue Date"
                                                        type="date"
                                                        required
                                                        {...register('license_issue', { required: 'Required' })}
                                                        error={errors.license_issue?.message}
                                                    />
                                                    <FormInput
                                                        label="Expiry Date"
                                                        type="date"
                                                        required
                                                        {...register('license_expiry', { required: 'Required' })}
                                                        error={errors.license_expiry?.message}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                <FormInput
                                                    label="Conductor License No"
                                                    required
                                                    {...register('conductor_license', { required: 'Required' })}
                                                    error={errors.conductor_license?.message}
                                                    placeholder="CL-XXXXXXXXXX"
                                                />
                                                <FormInput
                                                    label="Issuing Authority"
                                                    required
                                                    {...register('license_authority', { required: 'Required' })}
                                                    error={errors.license_authority?.message}
                                                    placeholder="Authority name"
                                                />
                                                <FormInput
                                                    label="Valid Until"
                                                    type="date"
                                                    required
                                                    {...register('license_valid', { required: 'Required' })}
                                                    error={errors.license_valid?.message}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiMapPin className="text-blue-500" /> Address</h3>
                                        <div className="grid grid-cols-1 gap-5">
                                            <FormInput label="Permanent Address" {...register('permanent_address')} placeholder="Full address with pincode" isTextArea />
                                            <FormInput label="Present Address" {...register('present_address')} placeholder="Leave blank if same as above" isTextArea />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Employment Details */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                            <FiDollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Employment Details</h2>
                                            <p className="text-sm text-gray-500">Work experience and salary information</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormInput label="Joining Date" type="date" {...register('start_date')} />
                                        <FormInput label="Experience (Years)" type="number" {...register('experience_years')} placeholder="e.g. 5" />
                                        <FormInput label="Last Salary (₹)" type="number" {...register('last_salary')} placeholder="e.g. 25000" />
                                        <FormInput label="Expected Salary (₹)" type="number" {...register('expected_salary')} placeholder="e.g. 30000" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormInput label="Education" {...register('education')} placeholder="Highest qualification" />
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employment Type</label>
                                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all h-[46px]">
                                                <input type="checkbox" {...register('fulltime')} className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500" />
                                                <span className="text-sm font-medium text-gray-800">Full-time Employee</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <FiLock className="text-primary-500" /> Login Credentials
                                        </h3>
                                        <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <FormInput 
                                                        label="Set Password" 
                                                        type={showPassword ? 'text' : 'password'} 
                                                        required={!isEditMode}
                                                        {...register('password', { required: isEditMode ? false : 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} 
                                                        error={errors.password?.message}
                                                        placeholder={isEditMode ? "Leave blank to keep current" : "Minimum 8 characters"}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <FormInput 
                                                        label="Confirm Password" 
                                                        type={showConfirmPassword ? 'text' : 'password'} 
                                                        required={!isEditMode}
                                                        {...register('confirm_password', { 
                                                            required: isEditMode ? false : 'Required', 
                                                            validate: (val) => {
                                                                const password = watch('password')
                                                                if (password && val !== password) {
                                                                    return 'Passwords do not match'
                                                                }
                                                                if (!isEditMode && !val) return 'Required'
                                                            }
                                                        })} 
                                                        error={errors.confirm_password?.message}
                                                        placeholder={isEditMode ? "Leave blank to keep current" : "Re-enter password"}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500">Staff will use their phone number and this password to login.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Health & Background */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                            <FiActivity className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Health & Background</h2>
                                            <p className="text-sm text-gray-500">Physical fitness and verification details</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <FormInput label="Height (cm)" type="number" {...register('height')} placeholder="e.g. 175" />
                                        <FormInput label="Weight (kg)" type="number" {...register('weight')} placeholder="e.g. 70" />
                                        <FormSelect 
                                            label="Vision" 
                                            {...register('vision')} 
                                            value={watch('vision')}
                                            options={[
                                                { value: 'normal', label: 'Normal' },
                                                { value: 'corrected', label: 'Corrected (Glasses)' }
                                            ]} 
                                        />
                                    </div>

                                    <FormInput label="Medical History" {...register('medical_history')} placeholder="Any allergies, chronic conditions, medications..." isTextArea />

                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <FiFile className="text-primary-500" /> Verification Documents
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-4">Upload supporting documents for each verification. PDF format recommended.</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <VerificationCard 
                                                label="Physically Fit" 
                                                description="Medical fitness certificate"
                                                color="green" 
                                                register={register('fitness_confirmed', { required: 'Required' })} 
                                                watch={watch}
                                                fieldName="fitness_confirmed"
                                                onFileSelect={(file: File | null) => setValue('fitness_doc', file)}
                                                file={watch('fitness_doc')}
                                                existingUrl={existingDocs.fitness_doc}
                                                required={true}
                                            />
                                            <VerificationCard 
                                                label="Police Verified" 
                                                description="Police verification"
                                                color="blue" 
                                                register={register('police_verified', { required: 'Required' })} 
                                                watch={watch}
                                                fieldName="police_verified"
                                                onFileSelect={(file: File | null) => setValue('police_doc', file)}
                                                file={watch('police_doc')}
                                                existingUrl={existingDocs.police_doc}
                                                required={true}
                                            />
                                            <VerificationCard 
                                                label="No Criminal Record" 
                                                description="Background check"
                                                color="purple" 
                                                register={register('no_criminal_record', { required: 'Required' })} 
                                                watch={watch}
                                                fieldName="no_criminal_record"
                                                onFileSelect={(file: File | null) => setValue('criminal_doc', file)}
                                                file={watch('criminal_doc')}
                                                existingUrl={existingDocs.criminal_doc}
                                                required={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review & Confirm */}
                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                            <FiEye className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Review & Confirm</h2>
                                            <p className="text-sm text-gray-500">Verify all details before submitting</p>
                                        </div>
                                    </div>

                                    {/* Quick Summary */}
                                    <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 border border-primary-200 rounded-xl p-4 flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-white border-2 border-primary-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {preview ? (
                                                <img src={preview} alt="Staff" className="w-full h-full object-cover" />
                                            ) : (
                                                <FiUser className="w-8 h-8 text-primary-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {watch('first_name') || 'First Name'} {watch('last_name') || ''}
                                            </h3>
                                            <p className="text-sm text-primary-600 font-medium capitalize">{selectedRole?.replace('_', ' ')} • {currentSchool.name}</p>
                                            <p className="text-xs text-gray-500">{watch('phone')} • {watch('email') || 'No email'}</p>
                                        </div>
                                    </div>

                                    {/* Review Sections */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Personal Details */}
                                        <ReviewSection title="Personal Details" icon={FiUser}>
                                            <ReviewItem label="Name" value={`${watch('first_name') || '-'} ${watch('last_name') || ''}`} />
                                            <ReviewItem label="Father/Spouse" value={watch('father_name')} />
                                            <ReviewItem label="Gender" value={watch('gender')} />
                                            <ReviewItem label="Date of Birth" value={watch('dob')} />
                                            <ReviewItem label="Phone" value={watch('phone')} />
                                            <ReviewItem label="Email" value={watch('email')} />
                                        </ReviewSection>

                                        {/* Credentials */}
                                        <ReviewSection title="Professional Credentials" icon={FiBriefcase}>
                                            <ReviewItem label="ID Type" value={watch('id_type')} />
                                            <ReviewItem label="ID Number" value={watch('id_number')} />
                                            <ReviewItem label="Nationality" value={watch('nationality')} />
                                            {selectedRole === 'driver' ? (
                                                <>
                                                    <ReviewItem label="License No" value={watch('license_number')} />
                                                    <ReviewItem label="License Expiry" value={watch('license_expiry')} />
                                                </>
                                            ) : (
                                                <ReviewItem label="Conductor License" value={watch('conductor_license')} />
                                            )}
                                        </ReviewSection>

                                        {/* Employment */}
                                        <ReviewSection title="Employment" icon={FiDollarSign}>
                                            <ReviewItem label="Joining Date" value={watch('start_date')} />
                                            <ReviewItem label="Experience" value={watch('experience_years') ? `${watch('experience_years')} years` : '-'} />
                                            <ReviewItem label="Expected Salary" value={watch('expected_salary') ? `₹${watch('expected_salary')}` : '-'} />
                                            <ReviewItem label="Employment Type" value={watch('fulltime') ? 'Full-time' : 'Part-time'} />
                                        </ReviewSection>

                                        {/* Health & Verification */}
                                        <ReviewSection title="Health & Safety" icon={FiActivity}>
                                            <ReviewItem label="Height" value={watch('height') ? `${watch('height')} cm` : '-'} />
                                            <ReviewItem label="Weight" value={watch('weight') ? `${watch('weight')} kg` : '-'} />
                                            <ReviewItem label="Vision" value={watch('vision')} />
                                            <div className="flex gap-2 flex-wrap pt-2">
                                                {watch('fitness_confirmed') && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">✓ Physically Fit</span>}
                                                {watch('police_verified') && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">✓ Police Verified</span>}
                                                {watch('no_criminal_record') && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg">✓ No Criminal Record</span>}
                                            </div>
                                        </ReviewSection>
                                    </div>

                                    {/* Confirmation Notice */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                        <FiAlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">Please verify all details carefully</p>
                                            <p className="text-xs text-amber-600 mt-1">Once submitted, staff will be added to {currentSchool.name} and will receive login credentials.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step Navigation */}
                        <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            {currentStep === 4 ? (
                                // Review step - show Edit and Confirm buttons
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(0)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg font-medium transition-all"
                                    >
                                        <FiEdit2 className="w-4 h-4" /> Edit Details
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleSubmit(onSubmit)}
                                        className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <FiCheck className="w-5 h-5" />
                                        )}
                                        Confirm & Submit
                                    </button>
                                </>
                            ) : (
                                // Other steps
                                <>
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        disabled={currentStep === 0}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                                            currentStep === 0 
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                        }`}
                                    >
                                        <FiChevronLeft /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
                                    >
                                        {currentStep === 3 ? 'Review Details' : 'Continue'} <FiChevronRight />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}

// Form Components
const FormInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, any>(({ label, error, isTextArea, className = "", ...props }, ref) => {
    return (
        <div className="w-full">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label} {props.required && <span className="text-red-500">*</span>}</label>
            {isTextArea ? (
                <textarea 
                    {...props}
                    ref={ref as React.Ref<HTMLTextAreaElement>}
                    rows={3}
                    className={`w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400 bg-white hover:border-gray-300 resize-none ${error ? 'border-red-300 focus:ring-red-100' : ''} ${className}`} 
                />
            ) : (
                <input 
                    {...props}
                    ref={ref as React.Ref<HTMLInputElement>}
                    className={`w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400 bg-white hover:border-gray-300 ${error ? 'border-red-300 focus:ring-red-100' : ''} ${className}`} 
                />
            )}
            {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><FiAlertCircle size={12} /> {error}</p>}
        </div>
    )
})

const FormSelect = forwardRef<HTMLSelectElement, any>(({ label, error, options, value, onChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedValue, setSelectedValue] = useState(value || '')
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    // Get selected option label
    const selectedLabel = options?.find((opt: any) => opt.value === selectedValue)?.label || 'Select...'

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Sync with external value changes
    useEffect(() => {
        setSelectedValue(value || '')
    }, [value])

    const handleSelect = (optValue: string) => {
        setSelectedValue(optValue)
        setIsOpen(false)
        // Trigger onChange for react-hook-form
        if (onChange) {
            const syntheticEvent = {
                target: { value: optValue, name: props.name }
            }
            onChange(syntheticEvent)
        }
    }

    return (
        <div className="w-full" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label} {props.required && <span className="text-red-500">*</span>}</label>
            
            {/* Hidden select for form submission */}
            <select 
                {...props}
                ref={ref}
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                className="sr-only"
                tabIndex={-1}
            >
                <option value="">Select...</option>
                {options?.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>

            {/* Custom dropdown trigger */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-4 py-2.5 text-sm text-left border rounded-lg transition-all flex items-center justify-between gap-2 ${
                        isOpen 
                            ? 'border-primary-500 ring-2 ring-primary-100 bg-white' 
                            : error 
                                ? 'border-red-300 bg-white hover:border-red-400' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                    <span className={selectedValue ? 'text-gray-900' : 'text-gray-400'}>
                        {selectedLabel}
                    </span>
                    <FiChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-[270deg]' : 'rotate-90'}`} />
                </button>

                {/* Dropdown menu */}
                {isOpen && (
                    <div className="absolute z-[9999] w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-100/50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="max-h-56 overflow-y-auto py-1.5">
                            <div
                                onClick={() => handleSelect('')}
                                className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                                    selectedValue === '' 
                                        ? 'bg-primary-50 text-primary-700' 
                                        : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <span>Select...</span>
                            </div>
                            {options?.map((opt: any) => (
                                <div
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                                        selectedValue === opt.value 
                                            ? 'bg-primary-50 text-primary-700 font-medium' 
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{opt.label}</span>
                                    {selectedValue === opt.value && (
                                        <FiCheck className="w-4 h-4 text-primary-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    )
})

function LanguagesMultiSelect({
    label,
    selected,
    onChange,
}: {
    label: string
    selected: string[]
    onChange: (langs: string[]) => void
}) {
    const [isOpen, setIsOpen] = useState(false)

    const toggleLanguage = (lang: string) => {
        if (selected.includes(lang)) {
            onChange(selected.filter((l) => l !== lang))
        } else {
            onChange([...selected, lang])
        }
    }

    const displayValue = selected.length ? selected.join(', ') : 'Select languages'

    return (
        <div className="w-full relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all bg-white flex items-center justify-between gap-2"
            >
                <span className={selected.length ? 'text-gray-900' : 'text-gray-400'}>{displayValue}</span>
                <FiChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-[270deg]' : 'rotate-90'}`} />
            </button>
            {isOpen && (
                <div className="absolute z-[9999] w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1.5">
                    {LANGUAGE_OPTIONS.map((lang) => {
                        const checked = selected.includes(lang)
                        return (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => toggleLanguage(lang)}
                                className={`w-full px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 ${
                                    checked ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                                }`}
                            >
                                <span>{lang}</span>
                                {checked && <FiCheck className="w-4 h-4 text-primary-600" />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function VerificationCard({ label, description, color, register, watch, fieldName, onFileSelect, file, required, existingUrl }: any) {
    const isChecked = watch(fieldName)
    const colors: any = {
        green: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-600', checked: 'border-green-400 bg-green-100' },
        blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-600', checked: 'border-blue-400 bg-blue-100' },
        purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-600', checked: 'border-purple-400 bg-purple-100' },
    }
    const colorSet = colors[color] || colors.green
    const isMissingFile = isChecked && !file && !existingUrl

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            // Limit file size to 5MB
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB')
                return
            }
            onFileSelect(selectedFile)
        }
    }

    const removeFile = () => {
        onFileSelect(null)
    }

    return (
        <div className={`p-4 rounded-xl border-2 transition-all ${isChecked ? colorSet.checked : colorSet.border + ' ' + colorSet.bg} ${isMissingFile ? 'border-red-300 bg-red-50' : ''}`}>
            <label className="flex items-start gap-3 cursor-pointer">
                <input 
                    type="checkbox" 
                    {...register} 
                    className={`w-5 h-5 rounded mt-0.5 ${colorSet.text} focus:ring-2`} 
                />
                <div className="flex-1">
                    <span className={`text-sm font-bold block ${colorSet.text}`}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </span>
                    <span className="text-xs text-gray-500">{description}</span>
                </div>
                {isChecked && !isMissingFile && <FiCheck className={`w-5 h-5 ${colorSet.text}`} />}
            </label>

            {/* PDF Upload - Shows when checked */}
            {isChecked && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    {!file && !existingUrl ? (
                         <label className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-dashed cursor-pointer hover:border-gray-400 transition-colors ${isMissingFile ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                            <div className={`p-2 rounded-lg ${isMissingFile ? 'bg-red-100 text-red-600' : colorSet.bg + ' ' + colorSet.text}`}>
                                <FiUpload className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${isMissingFile ? 'text-red-700' : 'text-gray-700'}`}>
                                    {isMissingFile ? 'Document Required *' : 'Upload Document'}
                                </p>
                                <p className="text-xs text-gray-400">PDF, max 5MB</p>
                            </div>
                            <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    ) : (
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2 rounded-lg ${colorSet.bg + ' ' + colorSet.text}`}>
                                    <FiCheck className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 truncate">
                                    {file ? file.name : (existingUrl ? 'Document Uploaded' : '')}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {existingUrl && !file && (
                                    <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors" title="View Document">
                                        <FiExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                                <button type="button" onClick={removeFile} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Change File">
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// Review Section Component
function ReviewSection({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary-500" /> {title}
            </h4>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    )
}

// Review Item Component
function ReviewItem({ label, value }: { label: string, value: string | undefined }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-900">{value || '-'}</span>
        </div>
    )
}
