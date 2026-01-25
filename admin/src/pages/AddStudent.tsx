import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { 
    FiArrowLeft, FiUpload, FiUser, FiChevronRight, FiChevronLeft, FiCheck, 
    FiUsers, FiBook, FiHeart, FiMapPin, FiFile, FiX, FiUserPlus
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { studentsAPI, accountsAPI, schoolsAPI, routesAPI, authAPI } from '../lib/api'

// Step definitions (10 comprehensive steps)
const STEPS = [
    { id: 'parent', title: 'Parent/Guardian', icon: FiUsers },
    { id: 'student', title: 'Student Info', icon: FiUser },
    { id: 'academic', title: 'Academic', icon: FiBook },
    { id: 'health', title: 'Health', icon: FiHeart },
    { id: 'address', title: 'Address', icon: FiMapPin },
    { id: 'transport', title: 'Transport', icon: FiMapPin },
    { id: 'financial', title: 'Financial', icon: FiFile },
    { id: 'international', title: 'International', icon: FiFile },
    { id: 'consents', title: 'Consents', icon: FiCheck },
    { id: 'review', title: 'Review', icon: FiCheck },
]


// Form Components
const FormInput = React.forwardRef<HTMLInputElement, any>(({ label, error, required, ...props }, ref) => (
    <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            ref={ref}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                error ? 'border-red-300' : 'border-gray-200'
            }`}
            {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
))

const FormSelect = React.forwardRef<HTMLSelectElement, any>(({ label, error, required, options, ...props }, ref) => (
    <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            ref={ref}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                error ? 'border-red-300' : 'border-gray-200'
            }`}
            {...props}
        >
            <option value="">Select...</option>
            {options?.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
))

// Options
const RELATION_OPTIONS = [
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'step_father', label: 'Step-Father' },
    { value: 'step_mother', label: 'Step-Mother' },
    { value: 'guardian', label: 'Legal Guardian' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'local_guardian', label: 'Local Guardian' },
]

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'transgender', label: 'Transgender' },
]

const BLOOD_GROUP_OPTIONS = [
    { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
]

const RELIGION_OPTIONS = [
    { value: 'hindu', label: 'Hindu' }, { value: 'muslim', label: 'Muslim' },
    { value: 'christian', label: 'Christian' }, { value: 'sikh', label: 'Sikh' },
    { value: 'buddhist', label: 'Buddhist' }, { value: 'jain', label: 'Jain' },
    { value: 'parsi', label: 'Parsi' }, { value: 'other', label: 'Other' },
]

const CATEGORY_OPTIONS = [
    { value: 'general', label: 'General' },
    { value: 'sc', label: 'SC (Scheduled Caste)' },
    { value: 'st', label: 'ST (Scheduled Tribe)' },
    { value: 'obc', label: 'OBC (Other Backward Class)' },
    { value: 'ews', label: 'EWS (Economically Weaker Section)' },
]

const BOARD_OPTIONS = [
    { value: 'cbse', label: 'CBSE' },
    { value: 'icse', label: 'ICSE/ISC' },
    { value: 'ib', label: 'IB' },
    { value: 'igcse', label: 'Cambridge IGCSE' },
    { value: 'state', label: 'State Board' },
    { value: 'other', label: 'Other' },
]

const DISABILITY_OPTIONS = [
    { value: 'visual', label: 'Visual Impairment' },
    { value: 'hearing', label: 'Hearing Impairment' },
    { value: 'locomotor', label: 'Locomotor Disability' },
    { value: 'cognitive', label: 'Cognitive/Intellectual' },
    { value: 'multiple', label: 'Multiple Disabilities' },
    { value: 'other', label: 'Other' },
]

const MEDIUM_OPTIONS = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'regional', label: 'Regional Language' },
]

const RESULT_OPTIONS = [
    { value: 'passed', label: 'Passed' },
    { value: 'failed', label: 'Failed' },
    { value: 'promoted', label: 'Promoted on Trial' },
]

const TRANSPORT_MODE_OPTIONS = [
    { value: 'school_bus', label: 'School Bus' },
    { value: 'private_car', label: 'Private Car' },
    { value: 'walk', label: 'Walk' },
    { value: 'public_transport', label: 'Public Transport' },
    { value: 'bicycle', label: 'Bicycle' },
]

const STUDENT_CATEGORY_OPTIONS = [
    { value: 'day_scholar', label: 'Day Scholar' },
    { value: 'boarder', label: 'Boarder' },
    { value: 'weekly_boarder', label: 'Weekly Boarder' },
]

const VISA_TYPE_OPTIONS = [
    { value: 's_visa', label: 'Student S-Visa' },
    { value: 'x_visa', label: 'Entry X-Visa' },
    { value: 'diplomatic', label: 'Diplomatic' },
    { value: 'other', label: 'Other' },
]

const ID_TYPE_OPTIONS = [
    { value: 'aadhar', label: 'Aadhaar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'voter_id', label: 'Voter ID' },
    { value: 'driving_license', label: 'Driving License' },
]

const LANGUAGE_OPTIONS = [
    { value: 'sanskrit', label: 'Sanskrit' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'other', label: 'Other' },
]

export default function AddStudent() {
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_photoFile, setPhotoFile] = useState<File | null>(null)

    // Queries
    const { data: userProfile } = useQuery({
        queryKey: ['me'],
        queryFn: () => authAPI.getProfile(),
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

    const { data: routesData } = useQuery({
        queryKey: ['routes'],
        queryFn: () => routesAPI.list(),
    })
    // Schools data for root admin school selection
    const schoolsList = schoolsData?.data?.results || schoolsData?.data || []
    const userSchools = userSchoolsData?.data?.results || userSchoolsData?.data || []
    const routes = routesData?.data?.results || routesData?.data || []

    const { register, handleSubmit, watch, setValue, formState: { errors }, trigger, control } = useForm({
        defaultValues: {
            // School
            school_id: '',
            // Parents array (supports multiple with extended fields)
            parents: [{
                name: '', phone: '', email: '', relation: 'father', occupation: '',
                designation: '', organization: '', annual_income: '', education_qualification: '',
                government_id_type: '', government_id_number: '', is_alumni: false,
                alumni_year: '', alumni_house: '', is_primary: true, is_primary_payer: false,
                // Custodial (Section 2)
                is_custodial_parent: true, has_legal_restraining_order: false,
                // Local Guardian (for boarders)
                is_local_guardian: false, lg_authorization_level: '', lg_visiting_rights: '',
                lg_proximity_km: '', lg_address: ''
            }],
            // === STUDENT IDENTITY ===
            admission_number: '', first_name: '', middle_name: '', last_name: '',
            date_of_birth: '', birth_place: '', gender: '', blood_group: '',
            // Demographics
            religion: '', nationality: 'Indian', mother_tongue: '', social_category: '', aadhar_number: '',
            // Socio-Economic
            bpl_status: false, bpl_card_number: '', ews_status: false, ews_certificate_number: '',
            is_cwsn: false, disability_type: '',
            // === ACADEMIC ===
            grade: '', section: '',
            previous_school_name: '', previous_school_city: '', previous_board: '', previous_medium: '',
            last_class_studied: '', last_class_result: '',
            has_tc: true, tc_number: '', tc_date: '',
            third_language: '', skill_subjects: '',
            // === ADDRESS (Current) ===
            current_house_number: '', current_building_name: '', current_street: '', current_locality: '',
            current_city: '', current_district: '', current_state: '', current_pincode: '',
            area_classification: '',
            // Permanent Address
            same_as_current: true,
            permanent_house_number: '', permanent_building_name: '', permanent_street: '', permanent_locality: '',
            permanent_city: '', permanent_district: '', permanent_state: '', permanent_pincode: '',
            // === HEALTH ===
            has_asthma: false, has_diabetes: false, has_epilepsy: false, other_conditions: '',
            asthma_action_plan: '', diabetes_protocol: '', epilepsy_protocol: '',
            allergies_dietary: '', allergies_environmental: '', allergies_medicinal: '',
            vaccine_bcg_date: '', vaccine_dpt_date: '', vaccine_polio_date: '',
            vaccine_mmr_date: '', vaccine_hepatitis_b_date: '', vaccine_varicella_date: '',
            wears_glasses: false, uses_hearing_aid: false, mobility_aid: '',
            doctor_name: '', doctor_phone: '', hospital_preference: '',
            // === TRANSPORT ===
            transport_opted: false, transport_mode: '', route: '', stop: '',
            pickup_address: '', drop_address: '',
            indemnity_bond_signed: false, behavior_contract_signed: false,
            // === FINANCIAL ===
            student_category: 'day_scholar',
            has_sibling_discount: false, sibling_admission_number: '',
            is_staff_ward: false, scholarship_type: '', is_rte_quota: false,
            bank_account_number: '', bank_account_holder: '', bank_name: '', bank_branch: '', bank_ifsc: '',
            is_aadhar_seeded: false,
            // === INTERNATIONAL ===
            is_international: false,
            passport_number: '', passport_country: '', passport_issue_date: '', passport_expiry_date: '',
            visa_type: '', is_oci: false, oci_number: '', frro_number: '', arrival_date: '',
            // === CONSENTS ===
            consent_website_media: false, consent_yearbook_media: false, consent_social_media: false,
            consent_acceptable_use: false, consent_data_processing: false, consent_third_party_sharing: false,
            consent_field_trips: false, consent_emergency_medical: false,
        }
    })

    // Parents field array for dynamic add/remove
    const { fields: parentFields, append: addParent, remove: removeParent } = useFieldArray({
        control,
        name: 'parents'
    })

    // Auto-select school for non-root admins
    useEffect(() => {
        if (userRole !== 'root_admin' && userSchools.length > 0) {
            const school = userSchools[0].school
            const schoolId = typeof school === 'object' ? school.id : school
            setValue('school_id', schoolId)
        }
    }, [userSchools, userRole, setValue])

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setPhotoFile(file)
            setPhotoPreview(URL.createObjectURL(file))
        }
    }

    const handleNext = async () => {
        let fieldsToValidate: string[] = []
        
        if (currentStep === 0) {
            // Validate first parent (required) and school for root admin
            fieldsToValidate = ['parents.0.name', 'parents.0.phone', 'parents.0.relation']
            if (userRole === 'root_admin') {
                fieldsToValidate.push('school_id')
            }
        } else if (currentStep === 1) {
            fieldsToValidate = ['admission_number', 'first_name', 'grade']
        }

        const isValid = await trigger(fieldsToValidate as any)
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

    const onSubmit = async (data: any) => {
        setIsSubmitting(true)
        try {
            // Map parents array to API format
            const parentsPayload = data.parents.map((p: any, index: number) => ({
                phone_number: p.phone, // Serializer expects phone_number or phone
                phone: p.phone,
                full_name: p.name,
                name: p.name,
                email: p.email || '',
                relation: p.relation,
                is_primary: index === 0,
                // Extended Parent Fields
                occupation: p.occupation || '',
                designation: p.designation || '',
                organization: p.organization || '',
                annual_income: p.annual_income || null,
                education_qualification: p.education_qualification || '',
                government_id_type: p.government_id_type || '',
                government_id_number: p.government_id_number || '',
                is_alumni: p.is_alumni || false,
                alumni_year: p.alumni_year || '',
                alumni_house: p.alumni_house || '',
                is_primary_payer: p.is_primary_payer || false,
                is_custodial_parent: p.is_custodial_parent !== false, // Default true
                has_legal_restraining_order: p.has_legal_restraining_order || false,
                is_local_guardian: p.is_local_guardian || false,
                lg_authorization_level: p.lg_authorization_level || '',
                lg_visiting_rights: p.lg_visiting_rights || '',
                lg_proximity_km: p.lg_proximity_km || null,
                lg_address: p.lg_address || '',
            }))

            // Construct Health Payload
            const healthPayload = {
                has_asthma: data.has_asthma || false,
                asthma_action_plan: data.asthma_action_plan || {},
                has_diabetes: data.has_diabetes || false,
                diabetes_protocol: data.diabetes_protocol || {},
                has_epilepsy: data.has_epilepsy || false,
                epilepsy_protocol: data.epilepsy_protocol || {},
                other_conditions: data.other_conditions || '',
                // Allergies
                allergies_dietary: data.allergies_dietary || [],
                allergies_environmental: data.allergies_environmental || [],
                allergies_medicinal: data.allergies_medicinal || [],
                // Vaccines
                vaccine_bcg_date: data.vaccine_bcg_date || null,
                vaccine_dpt_date: data.vaccine_dpt_date || null,
                vaccine_polio_date: data.vaccine_polio_date || null,
                vaccine_mmr_date: data.vaccine_mmr_date || null,
                vaccine_hepatitis_b_date: data.vaccine_hepatitis_b_date || null,
                vaccine_varicella_date: data.vaccine_varicella_date || null,
                // Impairments
                wears_glasses: data.wears_glasses || false,
                uses_hearing_aid: data.uses_hearing_aid || false,
                mobility_aid: data.mobility_aid || '',
                // Emergency
                doctor_name: data.doctor_name || '',
                doctor_phone: data.doctor_phone || '',
                hospital_preference: data.hospital_preference || '',
            }

            // Construct Final Payload (Single Student + Nested Parents + Nested Health)
            const payload = {
                school: data.school_id,
                parents: parentsPayload,
                health: healthPayload,
                
                // Core Identity
                admission_number: data.admission_number,
                first_name: data.first_name,
                middle_name: data.middle_name || '',
                last_name: data.last_name || '',
                date_of_birth: data.date_of_birth || null,
                birth_place: data.birth_place || '',
                gender: data.gender,
                blood_group: data.blood_group || '',
                photo: null, 

                // Demographics
                religion: data.religion || '',
                nationality: data.nationality || 'Indian',
                mother_tongue: data.mother_tongue || '',
                social_category: data.social_category || '',
                aadhar_number: data.aadhar_number || '',

                // Academic - Placement
                grade: data.grade,
                section: data.section || '',

                // Academic - History
                previous_school_name: data.previous_school_name || '',
                previous_school_city: data.previous_school_city || '',
                previous_board: data.previous_board || '',
                previous_medium: data.previous_medium || '',
                last_class_studied: data.last_class_studied || '',
                last_class_result: data.last_class_result || '',
                has_tc: data.has_tc !== false, // Default true
                tc_number: data.tc_number || '',
                tc_date: data.tc_date || null,
                
                // Curriculum
                third_language: data.third_language || '',
                skill_subjects: data.skill_subjects || [],

                // Address - Current
                current_house_number: data.current_house_number || '',
                current_building_name: data.current_building_name || '',
                current_street: data.current_street || '',
                current_locality: data.current_locality || '',
                current_city: data.current_city || '',
                current_district: data.current_district || '',
                current_state: data.current_state || '',
                current_pincode: data.current_pincode || '',
                area_classification: data.area_classification || '',

                // Address - Permanent
                same_as_current: data.same_as_current || false,
                permanent_house_number: data.permanent_house_number || '',
                permanent_building_name: data.permanent_building_name || '',
                permanent_street: data.permanent_street || '',
                permanent_locality: data.permanent_locality || '',
                permanent_city: data.permanent_city || '',
                permanent_district: data.permanent_district || '',
                permanent_state: data.permanent_state || '',
                permanent_pincode: data.permanent_pincode || '',

                // Transport
                transport_mode: data.transport_mode || '',
                transport_opted: data.transport_opted || false,
                route: data.route || null,
                pickup_address: data.pickup_address || '',
                drop_address: data.drop_address || data.pickup_address || '',

                // Financial
                student_category: data.student_category || 'day_scholar',
                has_sibling_discount: data.has_sibling_discount || false,
                sibling_admission_number: data.sibling_admission_number || '',
                is_staff_ward: data.is_staff_ward || false,
                scholarship_type: data.scholarship_type || '',
                is_rte_quota: data.is_rte_quota || false,
                bank_account_number: data.bank_account_number || '',
                bank_account_holder: data.bank_account_holder || '',
                bank_name: data.bank_name || '',
                bank_branch: data.bank_branch || '',
                bank_ifsc: data.bank_ifsc || '',
                is_aadhar_seeded: data.is_aadhar_seeded || false,

                // International
                is_international: data.is_international || false,
                passport_number: data.passport_number || '',
                passport_country: data.passport_country || '',
                passport_issue_date: data.passport_issue_date || null,
                passport_expiry_date: data.passport_expiry_date || null,
                visa_type: data.visa_type || '',
                is_oci: data.is_oci || false,
                oci_number: data.oci_number || '',
                frro_number: data.frro_number || '',
                arrival_date: data.arrival_date || null,

                // Consents
                consent_website_media: data.consent_website_media || false,
                consent_yearbook_media: data.consent_yearbook_media || false,
                consent_social_media: data.consent_social_media || false,
                consent_acceptable_use: data.consent_acceptable_use || false,
                consent_data_processing: data.consent_data_processing || false,
                consent_third_party_sharing: data.consent_third_party_sharing || false,
                consent_field_trips: data.consent_field_trips || false,
                consent_emergency_medical: data.consent_emergency_medical || false,
            }

            console.log('Submitting payload:', payload) // Debug payload
            await studentsAPI.admit(payload)
            toast.success('Student admitted successfully!')
            navigate('/students')
        } catch (error: any) {
            console.error(error)
            const message = error?.response?.data?.message || 'Failed to admit student'
            toast.error(message)
            // If validation errors, show them
            if (error?.response?.data) {
                 console.log('Validation errors:', error.response.data)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // School context for submission
    void schoolsList // Used for root admin school selection in future

    return (
        <div className="w-full max-w-5xl mx-auto pb-24 animate-fade-in px-4 sm:px-6">
            {/* Header */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/students')} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <FiArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Add New Student</h1>
                        <p className="text-xs text-gray-500">Complete admission form</p>
                    </div>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="bg-white rounded-lg border border-gray-100 p-3 mb-4">
                <div className="flex items-center justify-between overflow-x-auto">
                    {STEPS.map((step, index) => {
                        const isActive = index === currentStep
                        const isCompleted = index < currentStep
                        const StepIcon = step.icon
                        
                        return (
                            <div key={step.id} className="flex items-center flex-1 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => index < currentStep && setCurrentStep(index)}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                                        isActive ? 'bg-primary-50 text-primary-700 font-bold' 
                                        : isCompleted ? 'text-green-600 hover:bg-green-50 cursor-pointer'
                                        : 'text-gray-400'
                                    }`}
                                >
                                    <div className={`p-1 rounded ${
                                        isActive ? 'bg-primary-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                        {isCompleted ? <FiCheck className="w-3 h-3" /> : <StepIcon className="w-3 h-3" />}
                                    </div>
                                    <span className="hidden md:inline">{step.title}</span>
                                </button>
                                {index < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-1 ${index < currentStep ? 'bg-green-300' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    
                    {/* Step 0: Parent/Guardian */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                    <FiUsers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Parent/Guardian Details</h2>
                                    <p className="text-sm text-gray-500">Add one or more parent/guardian contacts</p>
                                </div>
                            </div>

                            {/* School Selection for Root Admin */}
                            {userRole === 'root_admin' && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-4">
                                    <FormSelect 
                                        label="Select School" 
                                        required 
                                        {...register('school_id', { required: 'School is required' })} 
                                        options={schoolsList.map((s: any) => ({ value: s.id, label: s.name }))} 
                                        error={errors.school_id?.message}
                                    />
                                </div>
                            )}

                            {/* Dynamic Parents List */}
                            <div className="space-y-4">
                                {parentFields.map((field, index) => (
                                    <div key={field.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-700">
                                                    {index === 0 ? 'Primary' : `Parent ${index + 1}`}
                                                </span>
                                                {index === 0 && (
                                                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Primary Contact</span>
                                                )}
                                            </div>
                                            {index > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeParent(index)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Remove parent"
                                                >
                                                    <FiX className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <FormInput 
                                                label="Full Name" 
                                                required 
                                                {...register(`parents.${index}.name` as const, { required: 'Required' })} 
                                                error={(errors.parents as any)?.[index]?.name?.message}
                                                placeholder="Enter full name" 
                                            />
                                            <FormInput 
                                                label="Phone Number" 
                                                required 
                                                {...register(`parents.${index}.phone` as const, { required: 'Required' })} 
                                                error={(errors.parents as any)?.[index]?.phone?.message}
                                                placeholder="+91 9876543210" 
                                            />
                                            <FormInput 
                                                label="Email" 
                                                type="email" 
                                                {...register(`parents.${index}.email` as const)} 
                                                placeholder="email@example.com" 
                                            />
                                            <FormSelect 
                                                label="Relation" 
                                                required 
                                                {...register(`parents.${index}.relation` as const, { required: 'Required' })} 
                                                options={RELATION_OPTIONS} 
                                                error={(errors.parents as any)?.[index]?.relation?.message}
                                            />
                                        </div>

                                        {/* Professional Details */}
                                        <div className="border-t pt-3 mt-3">
                                            <h4 className="text-xs font-semibold text-gray-600 mb-2">Professional Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <FormInput 
                                                    label="Occupation" 
                                                    {...register(`parents.${index}.occupation` as const)} 
                                                    placeholder="e.g. Engineer, Doctor" 
                                                />
                                                <FormInput 
                                                    label="Designation" 
                                                    {...register(`parents.${index}.designation` as const)} 
                                                    placeholder="e.g. Manager, Director" 
                                                />
                                                <FormInput 
                                                    label="Organization" 
                                                    {...register(`parents.${index}.organization` as const)} 
                                                    placeholder="Company name" 
                                                />
                                                <FormInput 
                                                    label="Annual Income" 
                                                    {...register(`parents.${index}.annual_income` as const)} 
                                                    placeholder="e.g. 500000" 
                                                />
                                                <FormInput 
                                                    label="Education Qualification" 
                                                    {...register(`parents.${index}.education_qualification` as const)} 
                                                    placeholder="e.g. MBA, B.Tech" 
                                                />
                                            </div>
                                        </div>

                                        {/* Government ID */}
                                        <div className="border-t pt-3 mt-3">
                                            <h4 className="text-xs font-semibold text-gray-600 mb-2">Government ID</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FormSelect 
                                                    label="ID Type" 
                                                    {...register(`parents.${index}.government_id_type` as const)} 
                                                    options={ID_TYPE_OPTIONS} 
                                                />
                                                <FormInput 
                                                    label="ID Number" 
                                                    {...register(`parents.${index}.government_id_number` as const)} 
                                                    placeholder="ID card number" 
                                                />
                                            </div>
                                        </div>

                                        {/* Alumni & Financial */}
                                        <div className="border-t pt-3 mt-3 flex flex-wrap gap-4">
                                            <label className="flex items-center gap-2 text-sm">
                                                <input type="checkbox" {...register(`parents.${index}.is_alumni` as const)} className="rounded" />
                                                <span>Alumni of this school</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <input type="checkbox" {...register(`parents.${index}.is_primary_payer` as const)} className="rounded" />
                                                <span>Primary Fee Payer</span>
                                            </label>
                                        </div>

                                        {/* Custodial & Legal */}
                                        <div className="border-t pt-3 mt-3">
                                            <h4 className="text-xs font-semibold text-gray-600 mb-2">Custodial & Legal Status</h4>
                                            <div className="flex flex-wrap gap-4">
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" {...register(`parents.${index}.is_custodial_parent` as const)} className="rounded" />
                                                    <span>Custodial Parent (Has physical custody)</span>
                                                </label>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" {...register(`parents.${index}.has_legal_restraining_order` as const)} className="rounded" />
                                                    <span className="text-red-600">Has Legal Restraining Order</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Local Guardian */}
                                        <div className="border-t pt-3 mt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-semibold text-gray-600">Local Guardian Details (for Boarders/Expats)</h4>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" {...register(`parents.${index}.is_local_guardian` as const)} className="rounded" />
                                                    <span>Is Local Guardian</span>
                                                </label>
                                            </div>
                                            
                                            {(watch(`parents.${index}.is_local_guardian` as const)) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <FormSelect 
                                                        label="Authorization Level" 
                                                        {...register(`parents.${index}.lg_authorization_level` as const)} 
                                                        options={[
                                                            { value: 'full', label: 'Full Authorization' },
                                                            { value: 'medical_only', label: 'Medical Only' },
                                                            { value: 'logistical_only', label: 'Logistical Only' },
                                                            { value: 'emergency_only', label: 'Emergency Only' }
                                                        ]} 
                                                    />
                                                    <FormSelect 
                                                        label="Visiting Rights" 
                                                        {...register(`parents.${index}.lg_visiting_rights` as const)} 
                                                        options={[
                                                            { value: 'weekend_exeat', label: 'Allowed Weekend Exeats' },
                                                            { value: 'campus_only', label: 'Campus Visits Only' },
                                                            { value: 'no_visits', label: 'No Visiting Rights' }
                                                        ]} 
                                                    />
                                                    <FormInput 
                                                        label="Proximity (km)" 
                                                        type="number"
                                                        {...register(`parents.${index}.lg_proximity_km` as const)} 
                                                        placeholder="Distance from school" 
                                                    />
                                                    <FormInput 
                                                        label="LG Address" 
                                                        {...register(`parents.${index}.lg_address` as const)} 
                                                        placeholder="Local address" 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Parent Button */}
                            <button
                                type="button"
                                onClick={() => addParent({
                                    name: '', phone: '', email: '', relation: 'mother', occupation: '',
                                    designation: '', organization: '', annual_income: '', education_qualification: '',
                                    government_id_type: '', government_id_number: '', is_alumni: false,
                                    alumni_year: '', alumni_house: '', is_primary: false, is_primary_payer: false,
                                    is_custodial_parent: true, has_legal_restraining_order: false,
                                    is_local_guardian: false, lg_authorization_level: '', lg_visiting_rights: '',
                                    lg_proximity_km: '', lg_address: ''
                                })}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                            >
                                <FiUserPlus className="w-4 h-4" /> Add Another Parent/Guardian
                            </button>
                        </div>
                    )}

                    {/* Step 1: Student Info */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <FiUser className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Student Information</h2>
                                    <p className="text-sm text-gray-500">Identity, demographics, and socio-economic details</p>
                                </div>
                            </div>

                            {/* Photo Upload */}
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                                <div className="relative w-16 h-16 shrink-0">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-white shadow-md" />
                                    ) : (
                                        <div className="w-full h-full bg-white rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                                            <FiUser size={24} />
                                        </div>
                                    )}
                                    <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700">
                                        <FiUpload size={12} />
                                        <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                                    </label>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Student Photo</p>
                                    <p className="text-xs text-gray-500">Upload a clear passport-size photo</p>
                                </div>
                            </div>

                            {/* Core Identity */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormInput label="Admission Number" required {...register('admission_number', { required: 'Required' })} error={errors.admission_number?.message} />
                                <FormInput label="First Name" required {...register('first_name', { required: 'Required' })} error={errors.first_name?.message} />
                                <FormInput label="Middle Name" {...register('middle_name')} />
                                <FormInput label="Last Name" {...register('last_name')} />
                                <FormInput label="Date of Birth" type="date" {...register('date_of_birth')} />
                                <FormInput label="Birth Place" {...register('birth_place')} placeholder="City, State" />
                                <FormSelect label="Gender" {...register('gender')} options={GENDER_OPTIONS} />
                                <FormSelect label="Blood Group" {...register('blood_group')} options={BLOOD_GROUP_OPTIONS} />
                            </div>

                            {/* Academic Placement */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Academic Placement</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormInput label="Grade/Class" required {...register('grade', { required: 'Required' })} error={errors.grade?.message} placeholder="e.g. 5, 10" />
                                    <FormInput label="Section" {...register('section')} placeholder="e.g. A, B" />
                                </div>
                            </div>

                            {/* Demographics */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Demographics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormSelect label="Religion" {...register('religion')} options={RELIGION_OPTIONS} />
                                    <FormInput label="Nationality" {...register('nationality')} />
                                    <FormInput label="Mother Tongue" {...register('mother_tongue')} />
                                    <FormSelect label="Social Category" {...register('social_category')} options={CATEGORY_OPTIONS} />
                                    <FormInput label="Aadhaar Number" {...register('aadhar_number')} placeholder="12 digit number" maxLength={12} />
                                </div>
                            </div>

                            {/* Socio-Economic Status */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Socio-Economic Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('bpl_status')} className="rounded" />
                                        <span className="text-sm">Below Poverty Line (BPL)</span>
                                    </label>
                                    {watch('bpl_status') && (
                                        <FormInput label="BPL Card Number" {...register('bpl_card_number')} />
                                    )}
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('ews_status')} className="rounded" />
                                        <span className="text-sm">Economically Weaker Section (EWS)</span>
                                    </label>
                                    {watch('ews_status') && (
                                        <FormInput label="EWS Certificate Number" {...register('ews_certificate_number')} />
                                    )}
                                </div>
                            </div>

                            {/* Special Needs (CWSN) */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Special Needs (CWSN)</h3>
                                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-3">
                                    <input type="checkbox" {...register('is_cwsn')} className="rounded" />
                                    <span className="text-sm">Child with Special Needs</span>
                                </label>
                                {watch('is_cwsn') && (
                                    <FormSelect label="Disability Type" {...register('disability_type')} options={DISABILITY_OPTIONS} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Academic */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <FiBook className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Academic History</h2>
                                    <p className="text-sm text-gray-500">Previous school, TC details, and curriculum</p>
                                </div>
                            </div>

                            {/* Previous School */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Previous School Name" {...register('previous_school_name')} />
                                <FormInput label="Previous School City" {...register('previous_school_city')} />
                                <FormSelect label="Previous Board" {...register('previous_board')} options={BOARD_OPTIONS} />
                                <FormSelect label="Medium of Instruction" {...register('previous_medium')} options={MEDIUM_OPTIONS} />
                                <FormInput label="Last Class Studied" {...register('last_class_studied')} placeholder="e.g. 5, 9" />
                                <FormSelect label="Last Class Result" {...register('last_class_result')} options={RESULT_OPTIONS} />
                            </div>

                            {/* Transfer Certificate */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Transfer Certificate (TC)</h3>
                                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-3">
                                    <input type="checkbox" {...register('has_tc')} className="rounded" />
                                    <span className="text-sm">Student has Transfer Certificate</span>
                                </label>
                                {watch('has_tc') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormInput label="TC Number" {...register('tc_number')} />
                                        <FormInput label="TC Date" type="date" {...register('tc_date')} />
                                    </div>
                                )}
                                {!watch('has_tc') && (
                                    <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                        An affidavit will be required in lieu of TC.
                                    </p>
                                )}
                            </div>

                            {/* Curriculum Selection */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Curriculum Selection</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormSelect label="Third Language" {...register('third_language')} options={LANGUAGE_OPTIONS} />
                                    <FormInput label="Skill Subjects (Class 9-10)" {...register('skill_subjects')} placeholder="e.g. AI, IT (comma separated)" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Health */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <FiHeart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Health Information</h2>
                                    <p className="text-sm text-gray-500">Medical conditions, allergies, vaccinations, and emergency contacts</p>
                                </div>
                            </div>

                            {/* Chronic Conditions */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-700">Chronic Conditions (IHP Triggers)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('has_asthma')} className="rounded" />
                                        <span className="text-sm">Asthma</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('has_diabetes')} className="rounded" />
                                        <span className="text-sm">Diabetes</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('has_epilepsy')} className="rounded" />
                                        <span className="text-sm">Epilepsy</span>
                                    </label>
                                </div>
                                
                                {/* IHP Protocol Fields (Conditional) */}
                                {(watch('has_asthma') || watch('has_diabetes') || watch('has_epilepsy')) && (
                                    <div className="space-y-3 p-3 bg-red-50 rounded-lg">
                                        <h4 className="text-xs font-bold text-red-800">Individual Health Plan (IHP) Protocols</h4>
                                        
                                        {watch('has_asthma') && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-700">Asthma Action Plan (Triggers & Response)</label>
                                                <textarea 
                                                    {...register('asthma_action_plan')} 
                                                    className="w-full p-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    placeholder="Describe green/yellow/red zones..."
                                                    rows={3}
                                                />
                                            </div>
                                        )}
                                        
                                        {watch('has_diabetes') && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-700">Diabetes Management Protocol</label>
                                                <textarea 
                                                    {...register('diabetes_protocol')} 
                                                    className="w-full p-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    placeholder="Insulin dosage, monitoring frequency, emergency contacts..."
                                                    rows={3}
                                                />
                                            </div>
                                        )}
                                        
                                        {watch('has_epilepsy') && (
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-700">Seizure Management Protocol</label>
                                                <textarea 
                                                    {...register('epilepsy_protocol')} 
                                                    className="w-full p-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    placeholder="Seizure type, duration, emergency medication..."
                                                    rows={3}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <FormInput label="Other Medical Conditions" {...register('other_conditions')} placeholder="Describe any other conditions" />
                            </div>

                            {/* Allergy Matrix */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Allergy Matrix</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormInput label="Dietary Allergies" {...register('allergies_dietary')} placeholder="Peanuts, Gluten, Dairy" />
                                    <FormInput label="Environmental Allergies" {...register('allergies_environmental')} placeholder="Bee stings, Pollen" />
                                    <FormInput label="Medicinal Allergies" {...register('allergies_medicinal')} placeholder="Penicillin, Aspirin" />
                                </div>
                            </div>

                            {/* Vaccination Registry */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Vaccination Registry</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <FormInput label="BCG Date" type="date" {...register('vaccine_bcg_date')} />
                                    <FormInput label="DPT Date" type="date" {...register('vaccine_dpt_date')} />
                                    <FormInput label="Polio Date" type="date" {...register('vaccine_polio_date')} />
                                    <FormInput label="MMR Date" type="date" {...register('vaccine_mmr_date')} />
                                    <FormInput label="Hepatitis B Date" type="date" {...register('vaccine_hepatitis_b_date')} />
                                    <FormInput label="Varicella Date" type="date" {...register('vaccine_varicella_date')} />
                                </div>
                            </div>

                            {/* Physical Impairments */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Physical Impairments</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('wears_glasses')} className="rounded" />
                                        <span className="text-sm">Wears Glasses</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('uses_hearing_aid')} className="rounded" />
                                        <span className="text-sm">Uses Hearing Aid</span>
                                    </label>
                                    <FormInput label="Mobility Aid" {...register('mobility_aid')} placeholder="Crutches, Wheelchair, None" />
                                </div>
                            </div>

                            {/* Emergency Medical */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Emergency Medical Contact</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormInput label="Doctor Name" {...register('doctor_name')} />
                                    <FormInput label="Doctor Phone" {...register('doctor_phone')} />
                                    <FormInput label="Preferred Hospital" {...register('hospital_preference')} />
                                </div>
                                <label className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mt-4">
                                    <input type="checkbox" {...register('consent_emergency_medical')} className="rounded" />
                                    <span className="text-sm text-red-700">I authorize the school to administer first aid and transport my child to hospital in an emergency</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Address */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                    <FiMapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Address Details</h2>
                                    <p className="text-sm text-gray-500">Current and permanent address information</p>
                                </div>
                            </div>

                            {/* Current Address */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Current/Correspondence Address</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormInput label="House Number" {...register('current_house_number')} />
                                    <FormInput label="Building Name" {...register('current_building_name')} />
                                    <FormInput label="Street/Road" {...register('current_street')} />
                                    <FormInput label="Locality/Colony" {...register('current_locality')} />
                                    <FormInput label="City" {...register('current_city')} />
                                    <FormInput label="District" {...register('current_district')} />
                                    <FormInput label="State" {...register('current_state')} />
                                    <FormInput label="Pincode" {...register('current_pincode')} maxLength={6} />
                                </div>
                            </div>

                            {/* UDISE+ Classification */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormSelect 
                                    label="Area Classification (UDISE+)" 
                                    {...register('area_classification')} 
                                    options={[
                                        { value: 'urban', label: 'Urban (Municipal Corporation)' },
                                        { value: 'rural', label: 'Rural (Gram Panchayat)' }
                                    ]} 
                                />
                            </div>

                            {/* Permanent Address */}
                            <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-700">Permanent Address</h3>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" {...register('same_as_current')} className="rounded" />
                                        <span className="text-sm">Same as Current Address</span>
                                    </label>
                                </div>
                                {!watch('same_as_current') && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormInput label="House Number" {...register('permanent_house_number')} />
                                        <FormInput label="Building Name" {...register('permanent_building_name')} />
                                        <FormInput label="Street/Road" {...register('permanent_street')} />
                                        <FormInput label="Locality/Colony" {...register('permanent_locality')} />
                                        <FormInput label="City" {...register('permanent_city')} />
                                        <FormInput label="District" {...register('permanent_district')} />
                                        <FormInput label="State" {...register('permanent_state')} />
                                        <FormInput label="Pincode" {...register('permanent_pincode')} maxLength={6} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Transport */}
                    {currentStep === 5 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <FiMapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Transport & Logistics</h2>
                                    <p className="text-sm text-gray-500">School transport and pickup details</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormSelect label="Transport Mode" {...register('transport_mode')} options={TRANSPORT_MODE_OPTIONS} />
                            </div>

                            <label className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                <input type="checkbox" {...register('transport_opted')} className="rounded" />
                                <span className="text-sm font-semibold">Opt for School Bus Transport</span>
                            </label>

                            {watch('transport_opted') && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormSelect 
                                            label="Select Route" 
                                            {...register('route')} 
                                            options={routes.map((r: any) => ({ value: r.id, label: r.name }))} 
                                        />
                                        <FormInput label="Pickup Address" {...register('pickup_address')} />
                                        <FormInput label="Drop Address (if different)" {...register('drop_address')} />
                                    </div>

                                    {/* Transport Agreements */}
                                    <div className="border-t pt-4 mt-4">
                                        <h3 className="text-sm font-bold text-gray-700 mb-3">Transport Agreements</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg">
                                                <input type="checkbox" {...register('indemnity_bond_signed')} className="rounded" />
                                                <span className="text-sm">I accept the Transport Indemnity Bond</span>
                                            </label>
                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg">
                                                <input type="checkbox" {...register('behavior_contract_signed')} className="rounded" />
                                                <span className="text-sm">Student agrees to Bus Behavior Contract</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 6: Financial */}
                    {currentStep === 6 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                                    <FiFile className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Financial Information</h2>
                                    <p className="text-sm text-gray-500">Fee classification, concessions, and banking</p>
                                </div>
                            </div>

                            {/* Student Category */}
                            <FormSelect label="Student Category" {...register('student_category')} options={STUDENT_CATEGORY_OPTIONS} />

                            {/* Fee Concessions */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Fee Concessions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('has_sibling_discount')} className="rounded" />
                                        <span className="text-sm">Sibling Discount</span>
                                    </label>
                                    {watch('has_sibling_discount') && (
                                        <FormInput label="Elder Sibling Admission No." {...register('sibling_admission_number')} />
                                    )}
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('is_staff_ward')} className="rounded" />
                                        <span className="text-sm">Staff Ward</span>
                                    </label>
                                    <FormInput label="Scholarship Type" {...register('scholarship_type')} placeholder="Merit/Sports/Other" />
                                    <label className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                                        <input type="checkbox" {...register('is_rte_quota')} className="rounded" />
                                        <span className="text-sm text-green-700">RTE (Right to Education) Quota</span>
                                    </label>
                                </div>
                            </div>

                            {/* Banking for DBT */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Banking Details (for DBT/Scholarships)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput label="Bank Account Number" {...register('bank_account_number')} />
                                    <FormInput label="Account Holder Name" {...register('bank_account_holder')} />
                                    <FormInput label="Bank Name" {...register('bank_name')} />
                                    <FormInput label="Branch" {...register('bank_branch')} />
                                    <FormInput label="IFSC Code" {...register('bank_ifsc')} />
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('is_aadhar_seeded')} className="rounded" />
                                        <span className="text-sm">Bank Account Aadhaar Seeded</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 7: International */}
                    {currentStep === 7 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <FiFile className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">International Student (FRRO)</h2>
                                    <p className="text-sm text-gray-500">Passport, visa, and FRRO details for foreign nationals</p>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                                <input type="checkbox" {...register('is_international')} className="rounded" />
                                <span className="text-sm font-semibold text-purple-700">This is an International Student</span>
                            </label>

                            {watch('is_international') && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                                    {/* Passport Details */}
                                    <h3 className="text-sm font-bold text-gray-700">Passport Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormInput label="Passport Number" {...register('passport_number')} />
                                        <FormInput label="Passport Country" {...register('passport_country')} />
                                        <FormInput label="Issue Date" type="date" {...register('passport_issue_date')} />
                                        <FormInput label="Expiry Date" type="date" {...register('passport_expiry_date')} />
                                    </div>

                                    {/* Visa & OCI */}
                                    <div className="border-t pt-4 mt-4">
                                        <h3 className="text-sm font-bold text-gray-700 mb-3">Visa & OCI Status</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormSelect label="Visa Type" {...register('visa_type')} options={VISA_TYPE_OPTIONS} />
                                            <label className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                                                <input type="checkbox" {...register('is_oci')} className="rounded" />
                                                <span className="text-sm">Overseas Citizen of India (OCI)</span>
                                            </label>
                                            {watch('is_oci') && (
                                                <FormInput label="OCI Card Number" {...register('oci_number')} />
                                            )}
                                        </div>
                                    </div>

                                    {/* FRRO */}
                                    <div className="border-t pt-4 mt-4">
                                        <h3 className="text-sm font-bold text-gray-700 mb-3">FRRO Registration</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormInput label="FRRO Registration Number" {...register('frro_number')} />
                                            <FormInput label="Arrival Date in India" type="date" {...register('arrival_date')} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!watch('is_international') && (
                                <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
                                    <p className="text-sm">This section is only applicable for international students.</p>
                                    <p className="text-xs mt-1">Check the box above if this student is a foreign national.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 8: Consents */}
                    {currentStep === 8 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                    <FiCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Legal Consents & Permissions</h2>
                                    <p className="text-sm text-gray-500">Required authorizations and agreements</p>
                                </div>
                            </div>

                            {/* Media Consents */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Media & Privacy Consents</h3>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_website_media')} className="rounded" />
                                        <span className="text-sm">Allow photos/videos on school website</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_yearbook_media')} className="rounded" />
                                        <span className="text-sm">Allow photos in school yearbook</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_social_media')} className="rounded" />
                                        <span className="text-sm">Allow photos on school social media</span>
                                    </label>
                                </div>
                            </div>

                            {/* Digital & Data Consents */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Data & Technology</h3>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_acceptable_use')} className="rounded" />
                                        <span className="text-sm">Agree to Acceptable Use Policy (Internet/Devices)</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_data_processing')} className="rounded" />
                                        <span className="text-sm text-blue-700">Consent to Data Processing (GDPR/DPDP)</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_third_party_sharing')} className="rounded" />
                                        <span className="text-sm">Allow data sharing with exam boards & vendors</span>
                                    </label>
                                </div>
                            </div>

                            {/* Activity Consents */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-700 mb-3">Activities & Medical</h3>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_field_trips')} className="rounded" />
                                        <span className="text-sm text-green-700">Standing permission for local field trips</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                                        <input type="checkbox" {...register('consent_emergency_medical')} className="rounded" />
                                        <span className="text-sm text-red-700">Authorize emergency medical treatment</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 9: Review */}
                    {currentStep === 9 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                    <FiCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Review & Confirm</h2>
                                    <p className="text-sm text-gray-500">Verify all details before submission</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Parents */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Parent/Guardian ({watch('parents')?.length || 0})</h3>
                                    {watch('parents')?.map((parent: any, idx: number) => (
                                        <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                                            <p className="text-sm font-semibold">{parent.name} ({parent.relation})</p>
                                            <p className="text-sm text-gray-600">{parent.phone} | {parent.email}</p>
                                            {parent.occupation && <p className="text-xs text-gray-500">{parent.occupation} at {parent.organization}</p>}
                                            {parent.is_custodial_parent && <span className="text-xs bg-green-100 text-green-700 px-1 rounded mr-1">Custodial</span>}
                                            {parent.is_local_guardian && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">Local Guardian</span>}
                                            {parent.has_legal_restraining_order && <p className="text-xs font-bold text-red-600 mt-1">⚠️ Legal Restraining Order</p>}
                                        </div>
                                    ))}
                                </div>

                                {/* Student Identity */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Student</h3>
                                    <p className="text-sm"><strong>Name:</strong> {watch('first_name')} {watch('middle_name')} {watch('last_name')}</p>
                                    <p className="text-sm"><strong>Admission No:</strong> {watch('admission_number')}</p>
                                    <p className="text-sm"><strong>Grade:</strong> {watch('grade')} {watch('section')}</p>
                                    <p className="text-sm"><strong>DOB:</strong> {watch('date_of_birth')}</p>
                                    <p className="text-sm"><strong>Gender:</strong> {watch('gender')} | <strong>Blood:</strong> {watch('blood_group')}</p>
                                </div>

                                {/* Health Summary */}
                                <div className="bg-red-50 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Health Profile</h3>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {watch('has_asthma') && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">Asthma</span>}
                                        {watch('has_diabetes') && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">Diabetes</span>}
                                        {watch('has_epilepsy') && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">Epilepsy</span>}
                                        {watch('wears_glasses') && <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded">Glasses</span>}
                                    </div>
                                    {(watch('asthma_action_plan') || watch('diabetes_protocol') || watch('epilepsy_protocol')) && (
                                        <p className="text-xs font-semibold text-red-700">⚠️ Includes IHP Protocols</p>
                                    )}
                                    <p className="text-xs mt-1"><strong>Doctor:</strong> {watch('doctor_name')} ({watch('doctor_phone')})</p>
                                    <p className="text-xs"><strong>Emergency Consent:</strong> {watch('consent_emergency_medical') ? '✅ Yes' : '❌ No'}</p>
                                </div>

                                {/* Address */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Address</h3>
                                    <p className="text-sm">{watch('current_house_number')} {watch('current_building_name')}</p>
                                    <p className="text-sm">{watch('current_street')}, {watch('current_locality')}</p>
                                    <p className="text-sm">{watch('current_city')}, {watch('current_state')} - {watch('current_pincode')}</p>
                                    {!watch('same_as_current') && <p className="text-xs text-gray-500 mt-1">(Permanent address differs)</p>}
                                </div>

                                {/* Transport */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Transport</h3>
                                    <p className="text-sm"><strong>Mode:</strong> {watch('transport_mode') || 'Not specified'}</p>
                                    {watch('transport_opted') && (
                                        <>
                                            <p className="text-sm"><strong>School Bus:</strong> Yes</p>
                                            <p className="text-xs text-gray-600">Route ID: {watch('route')}</p>
                                            <p className="text-xs text-gray-600">Pickup: {watch('pickup_address')}</p>
                                        </>
                                    )}
                                </div>

                                {/* Financial */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Financial</h3>
                                    <p className="text-sm"><strong>Category:</strong> {watch('student_category')}</p>
                                    {watch('bpl_status') && <p className="text-sm text-orange-600">BPL: Yes</p>}
                                    {watch('ews_status') && <p className="text-sm text-orange-600">EWS: Yes</p>}
                                    {watch('is_rte_quota') && <p className="text-sm text-green-600">RTE Quota: Yes</p>}
                                    {watch('bank_account_number') && <p className="text-xs text-gray-500 mt-1">Bank: {watch('bank_name')}</p>}
                                </div>

                                {/* International (Conditional) */}
                                {watch('is_international') && (
                                    <div className="bg-purple-50 rounded-xl p-4">
                                        <h3 className="font-bold text-purple-800 mb-2">International</h3>
                                        <p className="text-sm"><strong>Passport:</strong> {watch('passport_number')} ({watch('passport_country')})</p>
                                        <p className="text-sm"><strong>Visa:</strong> {watch('visa_type')}</p>
                                        <p className="text-sm"><strong>FRRO:</strong> {watch('frro_number')}</p>
                                    </div>
                                )}

                                {/* Consents Summary */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Consents</h3>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <p>Media: {watch('consent_website_media') ? '✅' : '❌'}</p>
                                        <p>Social: {watch('consent_social_media') ? '✅' : '❌'}</p>
                                        <p>Data: {watch('consent_data_processing') ? '✅' : '❌'}</p>
                                        <p>Trips: {watch('consent_field_trips') ? '✅' : '❌'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> Documents (Birth Certificate, TC, etc.) can be uploaded after student creation via the student profile page.
                                </p>
                            </div>

                            <label className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg">
                                <input type="checkbox" {...register('consent_data_processing')} className="rounded" />
                                <span className="text-sm text-primary-700">I confirm all details are accurate and agree to data processing terms</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-6">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                        <FiChevronLeft /> Back
                    </button>

                    {currentStep < STEPS.length - 1 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                        >
                            Next <FiChevronRight />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Admission'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
