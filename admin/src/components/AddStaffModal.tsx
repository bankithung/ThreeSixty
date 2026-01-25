import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffAPI, accountsAPI, schoolsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { useRef } from 'react'
import { FiX, FiChevronLeft, FiChevronRight, FiTruck, FiUser, FiCheck, FiChevronDown } from 'react-icons/fi'

// Section Header Component
function SectionHeader({ title, icon: Icon }: { title: string; icon?: React.ComponentType<{ className?: string }> }) {
    return (
        <div className="flex items-center gap-2 py-2 border-b border-gray-100 mb-3">
            {Icon && <Icon className="w-4 h-4 text-gray-500" />}
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h4>
        </div>
    )
}

// Form Input Component
function FormInput({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                {...props}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-300 outline-none transition-all"
            />
        </div>
    )
}

// Custom Form Dropdown Component
function FormDropdown({ label, required, value, onChange, options, placeholder }: { 
    label: string; 
    required?: boolean; 
    value: string; 
    onChange: (val: string) => void; 
    options: { value: string; label: string }[];
    placeholder?: string;
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

    const selectedOption = options.find(opt => opt.value === value)

    return (
        <div className="relative" ref={ref}>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-300 outline-none transition-all bg-white flex items-center justify-between"
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedOption?.label || placeholder || 'Select...'}
                </span>
                <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto scrollbar-thin">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value)
                                setIsOpen(false)
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${value === opt.value ? 'bg-primary-50 text-primary-900 font-medium' : 'text-gray-700'}`}
                        >
                            {opt.label}
                            {value === opt.value && <FiCheck className="w-4 h-4 text-primary-600" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// Form Textarea Component
function FormTextarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">{label}</label>
            <textarea
                {...props}
                rows={2}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-300 outline-none transition-all resize-none"
            />
        </div>
    )
}

// Step indicator Component
function StepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
    return (
        <div className="flex items-center justify-center gap-1 py-2">
            {steps.map((step, idx) => (
                <div key={idx} className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        idx < currentStep ? 'bg-green-500 text-white' : 
                        idx === currentStep ? 'bg-gray-900 text-white' : 
                        'bg-gray-200 text-gray-500'
                    }`}>
                        {idx < currentStep ? <FiCheck className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    {idx < steps.length - 1 && (
                        <div className={`w-8 h-0.5 mx-1 ${idx < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                </div>
            ))}
        </div>
    )
}

// Role Selection Component
function RoleSelection({ onSelect }: { onSelect: (role: string) => void }) {
    const roles = [
        { id: 'driver', name: 'Driver', icon: FiTruck, color: 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300' },
        { id: 'conductor', name: 'Conductor', icon: FiUser, color: 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300' },
        { id: 'teacher', name: 'Teacher', icon: FiUser, color: 'bg-blue-50 border-blue-200 opacity-50', disabled: true },
        { id: 'principal', name: 'Principal', icon: FiUser, color: 'bg-purple-50 border-purple-200 opacity-50', disabled: true },
        { id: 'vice_principal', name: 'Vice Principal', icon: FiUser, color: 'bg-indigo-50 border-indigo-200 opacity-50', disabled: true },
        { id: 'office_staff', name: 'Office Staff', icon: FiUser, color: 'bg-cyan-50 border-cyan-200 opacity-50', disabled: true },
        { id: 'accountant', name: 'Accountant', icon: FiUser, color: 'bg-teal-50 border-teal-200 opacity-50', disabled: true },
        { id: 'librarian', name: 'Librarian', icon: FiUser, color: 'bg-amber-50 border-amber-200 opacity-50', disabled: true },
        { id: 'nurse', name: 'Nurse', icon: FiUser, color: 'bg-pink-50 border-pink-200 opacity-50', disabled: true },
        { id: 'security', name: 'Security', icon: FiUser, color: 'bg-slate-50 border-slate-200 opacity-50', disabled: true },
        { id: 'helper', name: 'Helper', icon: FiUser, color: 'bg-stone-50 border-stone-200 opacity-50', disabled: true },
        { id: 'supervisor', name: 'Supervisor', icon: FiUser, color: 'bg-rose-50 border-rose-200 opacity-50', disabled: true },
    ]

    return (
        <div className="py-2">
            <p className="text-sm text-gray-600 text-center mb-4">Select the role you want to add</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {roles.map(role => (
                    <button
                        key={role.id}
                        type="button"
                        disabled={role.disabled}
                        onClick={() => !role.disabled && onSelect(role.id)}
                        className={`p-3 rounded-lg border text-center transition-all ${role.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${role.color}`}
                    >
                        <role.icon className="w-5 h-5 mx-auto mb-1.5 text-gray-600" />
                        <p className="font-medium text-gray-900 text-xs leading-tight">{role.name}</p>
                        {role.disabled && <p className="text-[10px] text-gray-500 mt-1">Coming Soon</p>}
                    </button>
                ))}
            </div>
        </div>
    )
}

// Driver Form Component
function DriverForm({ formData, setFormData, step }: { formData: any; setFormData: (data: any) => void; step: number }) {
    const updateField = (field: string, value: any) => setFormData({ ...formData, [field]: value })

    const steps = [
        // Step 0: Personal Details
        <div key="personal" className="space-y-3">
            <SectionHeader title="Personal Details" icon={FiUser} />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="First Name" required value={formData.first_name || ''} onChange={e => updateField('first_name', e.target.value)} />
                <FormInput label="Last Name" value={formData.last_name || ''} onChange={e => updateField('last_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Father's/Spouse Name" value={formData.father_name || ''} onChange={e => updateField('father_name', e.target.value)} />
                <FormDropdown label="Gender" required value={formData.gender || ''} onChange={(val) => updateField('gender', val)} options={[
                    { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }
                ]} />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <FormInput label="Date of Birth" type="date" value={formData.dob || ''} onChange={e => updateField('dob', e.target.value)} />
                <FormDropdown label="Marital Status" value={formData.marital_status || ''} onChange={(val) => updateField('marital_status', val)} options={[
                    { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }
                ]} />
                <FormInput label="Nationality" value={formData.nationality || 'Indian'} onChange={e => updateField('nationality', e.target.value)} />
            </div>
            <FormTextarea label="Permanent Address" value={formData.permanent_address || ''} onChange={e => updateField('permanent_address', e.target.value)} />
            <FormTextarea label="Present Address" value={formData.present_address || ''} onChange={e => updateField('present_address', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Mobile Number" required type="tel" value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
                <FormInput label="Email" type="email" value={formData.email || ''} onChange={e => updateField('email', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <FormInput label="Emergency Contact Name" value={formData.emergency_name || ''} onChange={e => updateField('emergency_name', e.target.value)} />
                <FormInput label="Relationship" value={formData.emergency_relation || ''} onChange={e => updateField('emergency_relation', e.target.value)} />
                <FormInput label="Emergency Phone" type="tel" value={formData.emergency_phone || ''} onChange={e => updateField('emergency_phone', e.target.value)} />
            </div>
        </div>,

        // Step 1: ID & Credentials
        <div key="credentials" className="space-y-3">
            <SectionHeader title="Identification" icon={FiUser} />
            <div className="grid grid-cols-2 gap-3">
                <FormDropdown label="ID Type" required value={formData.id_type || ''} onChange={(val) => updateField('id_type', val)} options={[
                    { value: 'aadhar', label: 'Aadhar Card' }, { value: 'voter_id', label: 'Voter ID' }, { value: 'passport', label: 'Passport' }
                ]} />
                <FormInput label="ID Number" required value={formData.id_number || ''} onChange={e => updateField('id_number', e.target.value)} />
            </div>
            <FormInput label="Languages Known" placeholder="e.g. Hindi, English, Nagamese" value={formData.languages || ''} onChange={e => updateField('languages', e.target.value)} />
            
            <SectionHeader title="Driving License" icon={FiTruck} />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="License Number" required value={formData.license_number || ''} onChange={e => updateField('license_number', e.target.value)} />
                <FormDropdown label="License Class" required value={formData.license_class || ''} onChange={(val) => updateField('license_class', val)} options={[
                    { value: 'hmv', label: 'HMV (Heavy Motor Vehicle)' }, { value: 'transport', label: 'Transport Vehicle' }, { value: 'psv', label: 'PSV/PSC (Passenger)' }
                ]} />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <FormInput label="Issuing RTA/State" value={formData.license_rta || ''} onChange={e => updateField('license_rta', e.target.value)} />
                <FormInput label="Issue Date" type="date" value={formData.license_issue || ''} onChange={e => updateField('license_issue', e.target.value)} />
                <FormInput label="Expiry Date" type="date" required value={formData.license_expiry || ''} onChange={e => updateField('license_expiry', e.target.value)} />
            </div>
            <FormInput label="Endorsements (PSV Badge, etc.)" value={formData.endorsements || ''} onChange={e => updateField('endorsements', e.target.value)} />
        </div>,

        // Step 2: Experience & Health
        <div key="experience" className="space-y-3">
            <SectionHeader title="Experience & Qualifications" />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Total Driving Experience (Years)" type="number" value={formData.experience_years || ''} onChange={e => updateField('experience_years', e.target.value)} />
                <FormInput label="Education (e.g. Class 10)" value={formData.education || ''} onChange={e => updateField('education', e.target.value)} />
            </div>
            <FormTextarea label="Previous Employment (Employer, Duration, Position)" value={formData.prev_employment || ''} onChange={e => updateField('prev_employment', e.target.value)} />
            <FormInput label="Professional Training (First Aid, Defensive Driving)" value={formData.training || ''} onChange={e => updateField('training', e.target.value)} />
            
            <SectionHeader title="Health & Fitness" />
            <div className="grid grid-cols-3 gap-3">
                <FormInput label="Height (cm)" type="number" value={formData.height || ''} onChange={e => updateField('height', e.target.value)} />
                <FormInput label="Weight (kg)" type="number" value={formData.weight || ''} onChange={e => updateField('weight', e.target.value)} />
                <FormDropdown label="Vision" value={formData.vision || ''} onChange={(val) => updateField('vision', val)} options={[
                    { value: 'normal', label: 'Normal' }, { value: 'with_glasses', label: 'With Glasses' }
                ]} />
            </div>
            <FormTextarea label="Medical History (Chronic illness, prior accidents)" value={formData.medical_history || ''} onChange={e => updateField('medical_history', e.target.value)} />
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <input type="checkbox" id="fit_confirm" className="w-4 h-4" checked={formData.fitness_confirmed || false} onChange={e => updateField('fitness_confirmed', e.target.checked)} />
                <label htmlFor="fit_confirm" className="text-xs text-gray-700">I confirm I am physically fit to drive a school bus</label>
            </div>
        </div>,

        // Step 3: Background & Employment
        <div key="background" className="space-y-3">
            <SectionHeader title="Background Check" />
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <input type="checkbox" id="police_verify" className="w-4 h-4" checked={formData.police_verified || false} onChange={e => updateField('police_verified', e.target.checked)} />
                <label htmlFor="police_verify" className="text-xs text-gray-700">Police Verification Certificate Obtained</label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                <input type="checkbox" id="no_criminal" className="w-4 h-4" checked={formData.no_criminal_record || false} onChange={e => updateField('no_criminal_record', e.target.checked)} />
                <label htmlFor="no_criminal" className="text-xs text-gray-700">No criminal record or traffic violations</label>
            </div>
            
            <SectionHeader title="Employment Details" />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Available Start Date" type="date" value={formData.start_date || ''} onChange={e => updateField('start_date', e.target.value)} />
                <FormInput label="Preferred Working Hours" placeholder="e.g. 6AM-9AM, 2PM-5PM" value={formData.working_hours || ''} onChange={e => updateField('working_hours', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Last Drawn Salary (₹)" type="number" value={formData.last_salary || ''} onChange={e => updateField('last_salary', e.target.value)} />
                <FormInput label="Expected Salary (₹)" type="number" value={formData.expected_salary || ''} onChange={e => updateField('expected_salary', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input type="checkbox" id="fulltime" className="w-4 h-4" checked={formData.fulltime || false} onChange={e => updateField('fulltime', e.target.checked)} />
                <label htmlFor="fulltime" className="text-xs text-gray-700">Willing for full-time, permanent employment</label>
            </div>
            
            <SectionHeader title="Account Credentials" />
            <FormInput label="Password" required type="password" placeholder="Min 8 characters" value={formData.password || ''} onChange={e => updateField('password', e.target.value)} />
        </div>,
    ]

    return steps[step] || null
}

// Conductor Form Component  
function ConductorForm({ formData, setFormData, step }: { formData: any; setFormData: (data: any) => void; step: number }) {
    const updateField = (field: string, value: any) => setFormData({ ...formData, [field]: value })

    const steps = [
        // Step 0: Personal Details
        <div key="personal" className="space-y-3">
            <SectionHeader title="Personal Details" icon={FiUser} />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="First Name" required value={formData.first_name || ''} onChange={e => updateField('first_name', e.target.value)} />
                <FormInput label="Last Name" value={formData.last_name || ''} onChange={e => updateField('last_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Father's/Spouse Name" value={formData.father_name || ''} onChange={e => updateField('father_name', e.target.value)} />
                <FormDropdown label="Gender" required value={formData.gender || ''} onChange={(val) => updateField('gender', val)} options={[
                    { value: 'male', label: 'Male' }, { value: 'female', label: 'Female (Preferred)' }, { value: 'other', label: 'Other' }
                ]} />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <FormInput label="Date of Birth" type="date" value={formData.dob || ''} onChange={e => updateField('dob', e.target.value)} />
                <FormDropdown label="Marital Status" value={formData.marital_status || ''} onChange={(val) => updateField('marital_status', val)} options={[
                    { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }
                ]} />
                <FormInput label="Nationality" value={formData.nationality || 'Indian'} onChange={e => updateField('nationality', e.target.value)} />
            </div>
            <FormTextarea label="Permanent Address" value={formData.permanent_address || ''} onChange={e => updateField('permanent_address', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Mobile Number" required type="tel" value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
                <FormInput label="Email" type="email" value={formData.email || ''} onChange={e => updateField('email', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <FormInput label="Emergency Contact Name" value={formData.emergency_name || ''} onChange={e => updateField('emergency_name', e.target.value)} />
                <FormInput label="Relationship" value={formData.emergency_relation || ''} onChange={e => updateField('emergency_relation', e.target.value)} />
                <FormInput label="Emergency Phone" type="tel" value={formData.emergency_phone || ''} onChange={e => updateField('emergency_phone', e.target.value)} />
            </div>
        </div>,

        // Step 1: ID, Education & Experience
        <div key="credentials" className="space-y-3">
            <SectionHeader title="Identification" icon={FiUser} />
            <div className="grid grid-cols-2 gap-3">
                <FormDropdown label="ID Type" required value={formData.id_type || ''} onChange={(val) => updateField('id_type', val)} options={[
                    { value: 'aadhar', label: 'Aadhar Card' }, { value: 'voter_id', label: 'Voter ID' }, { value: 'passport', label: 'Passport' }
                ]} />
                <FormInput label="ID Number" required value={formData.id_number || ''} onChange={e => updateField('id_number', e.target.value)} />
            </div>
            <FormInput label="Languages Known" placeholder="e.g. Hindi, English, Local language" value={formData.languages || ''} onChange={e => updateField('languages', e.target.value)} />
            
            <SectionHeader title="Education & Skills" />
            <FormInput label="Educational Qualification" placeholder="e.g. Class 8, Class 10" value={formData.education || ''} onChange={e => updateField('education', e.target.value)} />
            <FormInput label="Training/Skills (First Aid, Child Care)" value={formData.training || ''} onChange={e => updateField('training', e.target.value)} />
            
            <SectionHeader title="Experience" />
            <FormInput label="Years of Experience" type="number" value={formData.experience_years || ''} onChange={e => updateField('experience_years', e.target.value)} />
            <FormTextarea label="Previous Employment Details" value={formData.prev_employment || ''} onChange={e => updateField('prev_employment', e.target.value)} />
        </div>,

        // Step 2: Licensing & Health
        <div key="licensing" className="space-y-3">
            <SectionHeader title="Conductor License" />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="License Number" value={formData.conductor_license || ''} onChange={e => updateField('conductor_license', e.target.value)} placeholder="Leave blank if not yet obtained" />
                <FormInput label="Issuing Authority" value={formData.license_authority || ''} onChange={e => updateField('license_authority', e.target.value)} />
            </div>
            <FormInput label="Valid Until" type="date" value={formData.license_valid || ''} onChange={e => updateField('license_valid', e.target.value)} />
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <input type="checkbox" id="willing_license" className="w-4 h-4" checked={formData.willing_get_license || false} onChange={e => updateField('willing_get_license', e.target.checked)} />
                <label htmlFor="willing_license" className="text-xs text-gray-700">Willing to obtain conductor license if not already held</label>
            </div>
            
            <SectionHeader title="Health & Fitness" />
            <FormTextarea label="General Health Status" value={formData.health_status || ''} onChange={e => updateField('health_status', e.target.value)} />
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <input type="checkbox" id="fit_confirm" className="w-4 h-4" checked={formData.fitness_confirmed || false} onChange={e => updateField('fitness_confirmed', e.target.checked)} />
                <label htmlFor="fit_confirm" className="text-xs text-gray-700">I confirm I am fit to assist on a school bus</label>
            </div>
        </div>,

        // Step 3: Background & Employment
        <div key="background" className="space-y-3">
            <SectionHeader title="Background Check" />
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <input type="checkbox" id="police_verify" className="w-4 h-4" checked={formData.police_verified || false} onChange={e => updateField('police_verified', e.target.checked)} />
                <label htmlFor="police_verify" className="text-xs text-gray-700">Police Verification Certificate Obtained</label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                <input type="checkbox" id="no_criminal" className="w-4 h-4" checked={formData.no_criminal_record || false} onChange={e => updateField('no_criminal_record', e.target.checked)} />
                <label htmlFor="no_criminal" className="text-xs text-gray-700">No criminal history</label>
            </div>
            
            <SectionHeader title="Employment Details" />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Available Start Date" type="date" value={formData.start_date || ''} onChange={e => updateField('start_date', e.target.value)} />
                <FormInput label="Expected Salary (₹)" type="number" value={formData.expected_salary || ''} onChange={e => updateField('expected_salary', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input type="checkbox" id="fulltime" className="w-4 h-4" checked={formData.fulltime || false} onChange={e => updateField('fulltime', e.target.checked)} />
                <label htmlFor="fulltime" className="text-xs text-gray-700">Willing for full-time duties</label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input type="checkbox" id="understand_duties" className="w-4 h-4" checked={formData.understand_duties || false} onChange={e => updateField('understand_duties', e.target.checked)} />
                <label htmlFor="understand_duties" className="text-xs text-gray-700">I understand conductor duties (supervising students, assisting driver, ensuring safety)</label>
            </div>
            
            <SectionHeader title="Account Credentials" />
            <FormInput label="Password" required type="password" placeholder="Min 8 characters" value={formData.password || ''} onChange={e => updateField('password', e.target.value)} />
        </div>,
    ]

    return steps[step] || null
}

// Generic Staff Form Component (for Teacher, Principal, Office Staff, etc.)
function GenericStaffForm({ formData, setFormData, step }: { formData: any; setFormData: (data: any) => void; step: number }) {
    const updateField = (field: string, value: any) => setFormData({ ...formData, [field]: value })

    const steps = [
        // Step 0: Personal Details
        <div key="personal" className="space-y-3">
            <SectionHeader title="Personal Details" icon={FiUser} />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="First Name" required value={formData.first_name || ''} onChange={e => updateField('first_name', e.target.value)} />
                <FormInput label="Last Name" value={formData.last_name || ''} onChange={e => updateField('last_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <FormDropdown label="Gender" value={formData.gender || ''} onChange={(val) => updateField('gender', val)} options={[
                    { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }
                ]} />
                <FormInput label="Date of Birth" type="date" value={formData.dob || ''} onChange={e => updateField('dob', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Mobile Number" required type="tel" value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
                <FormInput label="Email" type="email" value={formData.email || ''} onChange={e => updateField('email', e.target.value)} />
            </div>
            <FormTextarea label="Address" value={formData.permanent_address || ''} onChange={e => updateField('permanent_address', e.target.value)} />
        </div>,

        // Step 1: ID & Qualification
        <div key="credentials" className="space-y-3">
            <SectionHeader title="Identification" icon={FiUser} />
            <div className="grid grid-cols-2 gap-3">
                <FormDropdown label="ID Type" value={formData.id_type || ''} onChange={(val) => updateField('id_type', val)} options={[
                    { value: 'aadhar', label: 'Aadhar Card' }, { value: 'voter_id', label: 'Voter ID' }, { value: 'passport', label: 'Passport' }
                ]} />
                <FormInput label="ID Number" value={formData.id_number || ''} onChange={e => updateField('id_number', e.target.value)} />
            </div>
            <FormInput label="Languages Known" placeholder="e.g. Hindi, English" value={formData.languages || ''} onChange={e => updateField('languages', e.target.value)} />
            
            <SectionHeader title="Qualifications" />
            <FormInput label="Educational Qualification" placeholder="e.g. B.Ed, M.A., B.Com" value={formData.education || ''} onChange={e => updateField('education', e.target.value)} />
            <FormInput label="Experience (Years)" type="number" value={formData.experience_years || ''} onChange={e => updateField('experience_years', e.target.value)} />
            <FormTextarea label="Previous Employment" value={formData.prev_employment || ''} onChange={e => updateField('prev_employment', e.target.value)} />
        </div>,

        // Step 2: Emergency & Health (simplified)
        <div key="health" className="space-y-3">
            <SectionHeader title="Emergency Contact" />
            <div className="grid grid-cols-3 gap-3">
                <FormInput label="Contact Name" value={formData.emergency_name || ''} onChange={e => updateField('emergency_name', e.target.value)} />
                <FormInput label="Relationship" value={formData.emergency_relation || ''} onChange={e => updateField('emergency_relation', e.target.value)} />
                <FormInput label="Phone" type="tel" value={formData.emergency_phone || ''} onChange={e => updateField('emergency_phone', e.target.value)} />
            </div>
            
            <SectionHeader title="Background" />
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <input type="checkbox" id="police_verify" className="w-4 h-4" checked={formData.police_verified || false} onChange={e => updateField('police_verified', e.target.checked)} />
                <label htmlFor="police_verify" className="text-xs text-gray-700">Police Verification Obtained</label>
            </div>
        </div>,

        // Step 3: Employment
        <div key="employment" className="space-y-3">
            <SectionHeader title="Employment Details" />
            <div className="grid grid-cols-2 gap-3">
                <FormInput label="Available Start Date" type="date" value={formData.start_date || ''} onChange={e => updateField('start_date', e.target.value)} />
                <FormInput label="Expected Salary (₹)" type="number" value={formData.expected_salary || ''} onChange={e => updateField('expected_salary', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input type="checkbox" id="fulltime" className="w-4 h-4" checked={formData.fulltime || false} onChange={e => updateField('fulltime', e.target.checked)} />
                <label htmlFor="fulltime" className="text-xs text-gray-700">Willing for full-time employment</label>
            </div>
            
            <SectionHeader title="Account Credentials" />
            <FormInput label="Password" required type="password" placeholder="Min 8 characters" value={formData.password || ''} onChange={e => updateField('password', e.target.value)} />
        </div>,
    ]

    return steps[step] || null
}

// Main Modal Component
interface AddStaffModalProps {
    onClose: () => void
    userRole?: string
    schoolId?: string
}

export default function AddStaffModal({ onClose, userRole, schoolId }: AddStaffModalProps) {
    const queryClient = useQueryClient()
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [currentStep, setCurrentStep] = useState(0)
    const [formData, setFormData] = useState<any>({})

    // Fetch schools for root admin
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

    // Set school_id when data loads
    useEffect(() => {
        if (schoolId) {
            setFormData((prev: any) => ({ ...prev, school_id: schoolId }))
        } else if (userSchools.length > 0 && !formData.school_id) {
            const school = userSchools[0].school
            setFormData((prev: any) => ({ ...prev, school_id: typeof school === 'object' ? school.id : school }))
        }
    }, [userSchools, schoolId, formData.school_id])

    const mutation = useMutation({
        mutationFn: (data: any) => staffAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            toast.success('Staff member created successfully')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to create staff')
        },
    })

    const totalSteps = 4
    const stepLabels = selectedRole === 'driver' 
        ? ['Personal', 'Credentials', 'Experience', 'Employment']
        : ['Personal', 'Education', 'Licensing', 'Employment']

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        } else {
            setSelectedRole(null)
        }
    }

    const handleSubmit = () => {
        // Validate required fields
        if (!formData.first_name || !formData.phone || !formData.password) {
            toast.error('Please fill all required fields')
            return
        }
        if (formData.password && formData.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
        
        // Prepare data for API
        const submitData = {
            ...formData,
            role: selectedRole,
            school_id: formData.school_id || schoolId,
        }
        
        mutation.mutate(submitData)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {selectedRole && (
                            <button onClick={handleBack} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <FiChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {selectedRole ? `Add ${selectedRole.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` : 'Add Staff Member'}
                            </h3>
                            {selectedRole && <p className="text-xs text-gray-500">Step {currentStep + 1} of {totalSteps}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Step Indicator */}
                {selectedRole && (
                    <div className="px-4 py-2 border-b border-gray-50 flex-shrink-0">
                        <StepIndicator steps={stepLabels} currentStep={currentStep} />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    {!selectedRole ? (
                        <RoleSelection onSelect={(role) => { setSelectedRole(role); setFormData({ role }) }} />
                    ) : selectedRole === 'driver' ? (
                        <DriverForm formData={formData} setFormData={setFormData} step={currentStep} />
                    ) : selectedRole === 'conductor' ? (
                        <ConductorForm formData={formData} setFormData={setFormData} step={currentStep} />
                    ) : (
                        // Generic form for other roles (Teacher, Principal, etc.)
                        <GenericStaffForm formData={formData} setFormData={setFormData} step={currentStep} />
                    )}

                    {/* School Selection for Root Admin */}
                    {selectedRole && userRole === 'root_admin' && currentStep === 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <FormDropdown 
                                label="School" 
                                required 
                                value={formData.school_id || ''} 
                                onChange={(val) => setFormData({ ...formData, school_id: val })}
                                options={schools.map((s: any) => ({ value: s.id, label: s.name }))} 
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                {selectedRole && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            ← Back
                        </button>
                        <div className="flex gap-2">
                            {currentStep < totalSteps - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
                                >
                                    Next <FiChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={mutation.isPending}
                                    className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                    {mutation.isPending ? 'Creating...' : 'Create Staff'}
                                    <FiCheck className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
