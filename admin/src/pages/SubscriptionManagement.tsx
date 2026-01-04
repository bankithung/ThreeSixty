import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsAPI, schoolsAPI } from '../lib/api'
import { FiCheck, FiX, FiPlus, FiTrash2, FiActivity } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function SubscriptionManagement() {
    const queryClient = useQueryClient()
    const [selectedSchool, setSelectedSchool] = useState<string>('')
    const [showAddModal, setShowAddModal] = useState(false)

    // Fetch all schools
    const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
        queryKey: ['schools'],
        queryFn: () => schoolsAPI.list(),
    })

    // Fetch all subscriptions (Root Admin sees all)
    const { data: subsData, isLoading: subsLoading } = useQuery({
        queryKey: ['allSubscriptions'],
        queryFn: () => subscriptionsAPI.listSubscriptions(),
    })

    // Fetch features for dropdown
    const { data: featuresData } = useQuery({
        queryKey: ['features'],
        queryFn: () => subscriptionsAPI.listFeatures(),
    })

    const schools = schoolsData?.data?.results || schoolsData?.data || []
    const subscriptions = subsData?.data?.results || subsData?.data || []
    const features = featuresData?.data?.results || featuresData?.data || []

    const createMutation = useMutation({
        mutationFn: (data: any) => subscriptionsAPI.createSubscription(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] })
            toast.success('Subscription created')
            setShowAddModal(false)
        },
        onError: (error: any) => toast.error('Failed to create subscription')
    })

    // Toggle active status or delete (using update for now if backend supports it, else delete)
    // Backend `SubscriptionViewSet` supports update.
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => subscriptionsAPI.updateSubscription(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] })
            toast.success('Subscription updated')
        }
    })

    if (schoolsLoading || subsLoading) return <div>Loading...</div>

    // Group subscriptions by school
    const subsBySchool = subscriptions.reduce((acc: any, sub: any) => {
        const sid = sub.school || sub.school_id
        if (!acc[sid]) acc[sid] = []
        acc[sid].push(sub)
        return acc
    }, {})

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <FiPlus className="mr-2" />
                    Add Subscription
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="divide-y">
                    {schools.map((school: any) => {
                        const schoolSubs = subsBySchool[school.id] || []
                        return (
                            <div key={school.id} className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">{school.name}</h3>
                                    <span className="text-sm text-gray-500">{schoolSubs.length} active features</span>
                                </div>
                                {schoolSubs.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {schoolSubs.map((sub: any) => (
                                            <div key={sub.id} className={`border rounded-lg p-3 flex justify-between items-center ${sub.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                                <div>
                                                    <p className="font-medium">{sub.feature_details?.name || 'Unknown Feature'}</p>
                                                    <p className="text-xs text-gray-500">{sub.start_date?.split('T')[0]}</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => updateMutation.mutate({ id: sub.id, data: { is_active: !sub.is_active } })}
                                                        className={`p-1 rounded ${sub.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}
                                                        title={sub.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        <FiActivity />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No subscriptions</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Add Subscription</h3>
                            <button onClick={() => setShowAddModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            createMutation.mutate({
                                school: formData.get('school'),
                                feature: formData.get('feature')
                            })
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">School</label>
                                <select name="school" required className="w-full border rounded p-2">
                                    <option value="">Select School</option>
                                    {schools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Feature</label>
                                <select name="feature" required className="w-full border rounded p-2">
                                    <option value="">Select Feature</option>
                                    {features.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <button disabled={createMutation.isPending} className="w-full bg-primary-500 text-white py-2 rounded hover:bg-primary-600">
                                {createMutation.isPending ? 'Saving...' : 'Add'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
