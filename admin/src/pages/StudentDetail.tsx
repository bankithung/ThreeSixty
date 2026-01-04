import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentsAPI } from '../lib/api'
import { FiArrowLeft, FiEdit2, FiMapPin, FiUser, FiPhone, FiCalendar } from 'react-icons/fi'
import { useState } from 'react'
import StudentFormModal from '../components/StudentFormModal'
import FaceRegistration from '../components/students/FaceRegistration'
import toast from 'react-hot-toast'

export default function StudentDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [showEditModal, setShowEditModal] = useState(false)

    const { data: studentData, isLoading, refetch } = useQuery({
        queryKey: ['student', id],
        queryFn: () => studentsAPI.get(id!),
        enabled: !!id,
    })

    const student = studentData?.data

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
            </div>
        )
    }

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="text-gray-500 mb-4">Student not found</div>
                <button
                    onClick={() => navigate('/students')}
                    className="text-primary-600 hover:text-primary-700"
                >
                    ← Back to Students
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/students')}
                        className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
                        <p className="text-gray-500">Admission #{student.admission_number}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <FiEdit2 className="mr-2" size={16} />
                        Edit
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Student Information Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem icon={<FiUser />} label="Full Name" value={student.full_name} />
                            <InfoItem icon={<FiCalendar />} label="Admission Number" value={student.admission_number} />
                            <InfoItem label="Grade" value={`${student.grade}${student.section ? ` - ${student.section}` : ''}`} />
                            <InfoItem label="Date of Birth" value={student.date_of_birth || 'Not set'} />
                            <InfoItem label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'Not set'} />
                            <InfoItem label="Status" value={
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {student.is_active ? 'Active' : 'Inactive'}
                                </span>
                            } />
                        </div>
                    </div>

                    {/* Transport Information Card */}
                    {student.pickup_address && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FiMapPin className="mr-2" />
                                Transport Information
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Pickup Address</label>
                                    <p className="text-gray-900">{student.pickup_address}</p>
                                    {student.pickup_latitude && student.pickup_longitude && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {student.pickup_latitude}, {student.pickup_longitude}
                                        </p>
                                    )}
                                </div>
                                {student.route_name && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Route</label>
                                        <p className="text-gray-900">{student.route_name}</p>
                                    </div>
                                )}
                                {student.stop_name && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Stop</label>
                                        <p className="text-gray-900">{student.stop_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Parents Information Card */}
                    {student.parents && student.parents.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parent Information</h2>
                            <div className="space-y-4">
                                {student.parents.map((parent: any, index: number) => (
                                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <h3 className="font-medium text-gray-900">{parent.user.full_name}</h3>
                                                {parent.is_primary && (
                                                    <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 capitalize">{parent.relation}</p>
                                            {parent.user.phone && (
                                                <div className="flex items-center mt-2 text-sm text-gray-600">
                                                    <FiPhone className="mr-1" size={14} />
                                                    {parent.user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Photo & Face Data */}
                <div className="space-y-6">
                    {/* Student Photo */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo</h2>
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {student.photo ? (
                                <img
                                    src={student.photo}
                                    alt={student.full_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <FiUser size={48} className="mx-auto mb-2" />
                                    <p className="text-sm">No photo</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Face Recognition */}
                    <FaceRegistration
                        studentId={student.id}
                        onSuccess={() => refetch()}
                    />

                    {/* Quick Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Parents</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {student.parents?.length || 0}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Transport</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {student.route_name ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Created</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {new Date(student.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <StudentFormModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    student={student}
                    onSuccess={() => {
                        refetch()
                        toast.success('Student updated')
                    }}
                />
            )}
        </div>
    )
}

// Helper component for info items
function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div>
            <label className="text-sm font-medium text-gray-500 flex items-center">
                {icon && <span className="mr-1">{icon}</span>}
                {label}
            </label>
            <div className="text-gray-900 mt-1">{value}</div>
        </div>
    )
}
