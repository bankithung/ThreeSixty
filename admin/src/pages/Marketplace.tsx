import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsAPI, accountsAPI } from '../lib/api'
import { FiShoppingBag, FiCheck, FiPackage, FiActivity } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function Marketplace() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Fetch all available features
    const { data: featuresData, isLoading: featuresLoading } = useQuery({
        queryKey: ['features'],
        queryFn: () => subscriptionsAPI.listFeatures(),
    })

    // Fetch my subscriptions
    const { data: mySubscriptionsData, isLoading: subsLoading } = useQuery({
        queryKey: ['mySubscriptionsDetails'],
        queryFn: () => subscriptionsAPI.listSubscriptions(),
    })

    const { data: userSchoolsData } = useQuery({
        queryKey: ['userSchools'],
        queryFn: () => accountsAPI.getUserSchools(),
        enabled: user?.role !== 'root_admin',
    })

    const features = featuresData?.data?.results || featuresData?.data || []
    const subscriptions = mySubscriptionsData?.data?.results || mySubscriptionsData?.data || []
    const userSchools = userSchoolsData?.data?.results || userSchoolsData?.data || []

    // For School Admin, we default to their first school for now
    // Backend serializer returns 'school' as key with the ID string value.
    const currentSchoolId = user?.role === 'root_admin' ? null : (userSchools[0]?.school)

    const subscribeMutation = useMutation({
        mutationFn: (featureId: string) => subscriptionsAPI.createSubscription({
            school_id: currentSchoolId,
            feature_id: featureId
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mySubscriptions'] })
            queryClient.invalidateQueries({ queryKey: ['mySubscriptionsDetails'] })
            toast.success('Feature activated successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to activate feature')
        }
    })

    const isSubscribed = (featureId: string) => {
        return subscriptions.some((sub: any) => sub.feature === featureId && sub.is_active)
    }

    if (featuresLoading || subsLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
                    <p className="text-gray-500 mt-1">Discover and activate features for your school</p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <FiShoppingBag className="w-6 h-6 text-primary-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature: any) => {
                    const active = isSubscribed(feature.id)
                    return (
                        <div key={feature.id} className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-md ${active ? 'border-green-500' : 'border-transparent'}`}>
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${active ? 'bg-green-100' : 'bg-blue-100'}`}>
                                        {active ? (
                                            <FiCheck className="w-6 h-6 text-green-600" />
                                        ) : (
                                            <FiPackage className="w-6 h-6 text-blue-600" />
                                        )}
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">₹{feature.price}</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.name}</h3>
                                <p className="text-gray-500 text-sm mb-6 min-h-[60px]">{feature.description}</p>

                                <button
                                    onClick={() => !active && currentSchoolId && subscribeMutation.mutate(feature.id)}
                                    disabled={active || !currentSchoolId || subscribeMutation.isPending}
                                    className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors ${active
                                        ? 'bg-green-50 text-green-700 cursor-default'
                                        : !currentSchoolId
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-primary-500 text-white hover:bg-primary-600'
                                        }`}
                                >
                                    {subscriptionStatusText(active, subscribeMutation.isPending)}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {features.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <FiActivity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No features available</h3>
                    <p className="text-gray-500">Check back later for new modules.</p>
                </div>
            )}
        </div>
    )
}

function subscriptionStatusText(isActive: boolean, isPending: boolean) {
    if (isActive) return 'Active'
    if (isPending) return 'Activating...'
    return 'Activate Now'
}
