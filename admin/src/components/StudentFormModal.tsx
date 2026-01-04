import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI, schoolsAPI, routesAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiX, FiPlus, FiTrash2, FiCamera } from 'react-icons/fi'
import FaceRegistration from './students/FaceRegistration'

interface StudentFormModalProps {
    isOpen: boolean
    onClose: () => void
    student?: any
    onSuccess: () => void
}

export default function StudentFormModal({ isOpen, onClose, student, onSuccess }: StudentFormModalProps) {
    const queryClient = useQueryClient()

    // Parent state
    const [motherName, setMotherName] = useState('')
    const [motherPhone, setMotherPhone] = useState('')
    const [fatherName, setFatherName] = useState('')
    const [fatherPhone, setFatherPhone] = useState('')

    // Students state (array for multiple children)
    const [students, setStudents] = useState([{
        admission_number: '',
        first_name: '',
        last_name: '',
        grade: '',
        section: '',
        pickup_address: '',
        pickup_latitude: '',
        pickup_longitude: '',
    }])

    const [school, setSchool] = useState('')
    const [hasTransport, setHasTransport] = useState(false)
    const [selectedRoute, setSelectedRoute] = useState('')

    // Fetch schools for dropdown
    const { data: schoolsData } = useQuery({
        queryKey: ['schools-list'],
        queryFn: () => schoolsAPI.list(),
        enabled: isOpen,
    })

    // Fetch routes for dropdown when transport is enabled
    const { data: routesData } = useQuery({
        queryKey: ['routes-list', school],
        queryFn: () => routesAPI.list({ school_id: school }),
        enabled: isOpen && hasTransport && !!school,
    })

    const schools = schoolsData?.data?.results || schoolsData?.data || []
    const routes = routesData?.data?.results || routesData?.data || []

    useEffect(() => {
        if (student) {
            // Edit mode - load student data with proper type conversion
            setStudents([{
                admission_number: student.admission_number || '',
                first_name: student.first_name || '',
                last_name: student.last_name || '',
                grade: student.grade || '',
                section: student.section || '',
                pickup_address: student.pickup_address || '',
                pickup_latitude: student.pickup_latitude ? String(student.pickup_latitude) : '0',
                pickup_longitude: student.pickup_longitude ? String(student.pickup_longitude) : '0',
            }])
            setSchool(student.school || '')

            // Check if student has transport
            if (student.pickup_address && student.pickup_address.trim() !== '') {
                setHasTransport(true)
            } else {
                setHasTransport(false)
            }
        } else {
            // Reset form for new enrollment
            setMotherName('')
            setMotherPhone('')
            setFatherName('')
            setFatherPhone('')
            setStudents([{
                admission_number: '',
                first_name: '',
                last_name: '',
                grade: '',
                section: '',
                pickup_address: '',
                pickup_latitude: '0',
                pickup_longitude: '0',
            }])
            setHasTransport(false)
        }
    }, [student, isOpen])

    // Auto-select school when schools load
    useEffect(() => {
        if (!student && schools.length > 0 && !school) {
            setSchool(schools[0].id)
        }
    }, [schools.length, student, school])

    const enrollMutation = useMutation({
        mutationFn: (data: any) => studentsAPI.enroll(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            toast.success('Students enrolled successfully')
            onSuccess()
            onClose()
        },
        onError: (error: any) => {
            console.error(error)
            toast.error(error.response?.data?.message || 'Failed to enroll students')
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            studentsAPI.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            toast.success('Student updated successfully')
            onSuccess()
            onClose()
        },
        onError: (error: any) => {
            console.error(error)
            toast.error(error.response?.data?.detail || 'Failed to update student')
        },
    })

    const addStudent = () => {
        setStudents([...students, {
            admission_number: '',
            first_name: '',
            last_name: '',
            grade: '',
            section: '',
            pickup_address: '',
            pickup_latitude: '0',
            pickup_longitude: '0',
        }])
    }

    const removeStudent = (index: number) => {
        if (students.length > 1) {
            setStudents(students.filter((_, i) => i !== index))
        }
    }

    const updateStudent = (index: number, field: string, value: string) => {
        const updated = [...students]
        updated[index] = { ...updated[index], [field]: value }
        setStudents(updated)
    }

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (student) {
            // Edit mode - use existing update logic
            const data = { ...students[0], school }
            updateMutation.mutate({ id: student.id, data })
        } else {
            // New enrollment - use parent-first endpoint
            const parents = []
            if (motherName && motherPhone) {
                parents.push({
                    full_name: motherName,
                    phone_number: motherPhone,
                    relation: 'mother',
                    is_primary: true,
                })
            }
            if (fatherName && fatherPhone) {
                parents.push({
                    full_name: fatherName,
                    phone_number: fatherPhone,
                    relation: 'father',
                    is_primary: false,
                })
            }

            if (parents.length === 0) {
                toast.error('At least one parent is required')
                return
            }

            const enrollmentData = {
                school,
                parents,
                students: students.map(s => ({
                    ...s,
                    route: hasTransport && selectedRoute ? selectedRoute : null,
                    pickup_latitude: hasTransport ? parseFloat(s.pickup_latitude) || 0 : null,
                    pickup_longitude: hasTransport ? parseFloat(s.pickup_longitude) || 0 : null,
                    pickup_address: hasTransport ? s.pickup_address : null,
                    drop_address: hasTransport ? s.pickup_address : null,
                    drop_latitude: hasTransport ? parseFloat(s.pickup_latitude) || 0 : null,
                    drop_longitude: hasTransport ? parseFloat(s.pickup_longitude) || 0 : null,
                })),
            }

            enrollMutation.mutate(enrollmentData)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {student ? 'Edit Student' : 'Enroll New Student(s)'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                    {/* School Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            School <span className="text-red-500">*</span>
                        </label>
                        {schools.length === 1 ? (
                            <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                {schools[0].name}
                            </div>
                        ) : (
                            <select
                                required
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                            >
                                <option value="">Select School</option>
                                {schools.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Parent Information (only for new enrollment) */}
                    {!student && (
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-4">Parent Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mother's Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={motherName}
                                        onChange={(e) => setMotherName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        placeholder="e.g. Jane Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mother's Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={motherPhone}
                                        onChange={(e) => setMotherPhone(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Father's Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fatherName}
                                        onChange={(e) => setFatherName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Father's Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={fatherPhone}
                                        onChange={(e) => setFatherPhone(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Student Information */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900">
                                Student Information {students.length > 1 && `(${students.length} children)`}
                            </h3>
                            {!student && (
                                <button
                                    type="button"
                                    onClick={addStudent}
                                    className="flex items-center px-3 py-1 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                                >
                                    <FiPlus className="mr-1" size={16} />
                                    Add Sibling
                                </button>
                            )}
                        </div>

                        {students.map((studentData, index) => (
                            <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg relative">
                                {!student && students.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeStudent(index)}
                                        className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="Remove"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                )}

                                {students.length > 1 && (
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                                        Child {index + 1}
                                    </h4>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Admission Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={studentData.admission_number}
                                            onChange={(e) => updateStudent(index, 'admission_number', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={studentData.first_name}
                                            onChange={(e) => updateStudent(index, 'first_name', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={studentData.last_name}
                                            onChange={(e) => updateStudent(index, 'last_name', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Grade <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={studentData.grade}
                                            onChange={(e) => updateStudent(index, 'grade', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Section
                                        </label>
                                        <input
                                            type="text"
                                            value={studentData.section}
                                            onChange={(e) => updateStudent(index, 'section', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Transport details */}
                                {hasTransport && index === 0 && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Pickup Address
                                            </label>
                                            <input
                                                type="text"
                                                required={hasTransport}
                                                value={studentData.pickup_address}
                                                onChange={(e) => updateStudent(index, 'pickup_address', e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Latitude
                                            </label>
                                            <input
                                                type="number"
                                                step="0.0000001"
                                                required={hasTransport}
                                                value={studentData.pickup_latitude}
                                                onChange={(e) => updateStudent(index, 'pickup_latitude', e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Longitude
                                            </label>
                                            <input
                                                type="number"
                                                step="0.0000001"
                                                required={hasTransport}
                                                value={studentData.pickup_longitude}
                                                onChange={(e) => updateStudent(index, 'pickup_longitude', e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Face Registration Section - Only for existing students in Edit Mode */}
                    {student && (
                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                                <FiCamera className="mr-2" /> Face Registration
                            </h3>
                            <FaceRegistration studentId={student.id} />
                        </div>
                    )}

                    {/* Transport Toggle */}
                    <div className="border-t pt-4">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasTransport}
                                onChange={(e) => setHasTransport(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-700">Opt for Bus Service</span>
                        </label>

                        {/* Route Selection - appears when transport is enabled */}
                        {hasTransport && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Assign to Route
                                </label>
                                {routes.length > 0 ? (
                                    <select
                                        value={selectedRoute}
                                        onChange={(e) => setSelectedRoute(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                                    >
                                        <option value="">Select a route (optional)</option>
                                        {routes.map((route: any) => (
                                            <option key={route.id} value={route.id}>
                                                {route.name} {route.bus_number && `(Bus ${route.bus_number})`}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">
                                        No routes available. You can assign the student later from the Routes page.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={enrollMutation.isPending || updateMutation.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            {updateMutation.isPending || enrollMutation.isPending
                                ? 'Saving...'
                                : student
                                    ? 'Update Student'
                                    : 'Enroll Student(s)'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
