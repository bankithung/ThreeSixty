import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI, emergencyAPI } from '../lib/api'
import toast from 'react-hot-toast'
import { FiUser, FiLock, FiPhone, FiBell, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi'

export default function Settings() {
    const { user, refreshUser } = useAuth()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'contacts'>('profile')

    const [profile, setProfile] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
    })

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    })

    const updateProfileMutation = useMutation({
        mutationFn: (data: any) => authAPI.updateProfile(data),
        onSuccess: () => {
            refreshUser()
            toast.success('Profile updated')
        },
        onError: () => toast.error('Failed to update profile'),
    })

    const tabs = [
        { id: 'profile', label: 'Profile', icon: FiUser },
        { id: 'security', label: 'Security', icon: FiLock },
        { id: 'contacts', label: 'Emergency Contacts', icon: FiPhone },
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm">
                <div className="flex border-b">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className="w-5 h-5 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                updateProfileMutation.mutate(profile)
                            }}
                            className="space-y-6"
                        >
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span className="text-2xl font-bold text-primary-600">
                                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{user?.full_name}</h3>
                                    <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={profile.first_name}
                                        onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={profile.last_name}
                                        onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={updateProfileMutation.isPending}
                                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                                >
                                    <FiSave className="mr-2" />
                                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <form className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                                >
                                    <FiLock className="mr-2" />
                                    Update Password
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Emergency Contacts Tab */}
                    {activeTab === 'contacts' && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-500">
                                Manage emergency contacts for your school. These contacts will be notified immediately in case of emergencies.
                            </p>

                            <div className="space-y-4">
                                {[
                                    { name: 'Principal Office', phone: '+91 98765 43210', designation: 'Primary Contact' },
                                    { name: 'Transport Head', phone: '+91 98765 43211', designation: 'Transport Department' },
                                ].map((contact, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium">{contact.name}</p>
                                            <p className="text-sm text-gray-500">{contact.designation}</p>
                                            <p className="text-sm text-primary-500">{contact.phone}</p>
                                        </div>
                                        <button className="p-2 text-gray-500 hover:text-red-500">
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button className="flex items-center px-4 py-2 border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-50">
                                <FiPlus className="mr-2" />
                                Add Contact
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Notifications Settings */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                    <FiBell className="w-5 h-5 text-gray-500 mr-2" />
                    <h3 className="text-lg font-semibold">Notification Preferences</h3>
                </div>
                <div className="space-y-4">
                    {[
                        { label: 'Emergency Alerts', desc: 'Get notified immediately for all emergencies', enabled: true },
                        { label: 'Trip Updates', desc: 'Status changes for trips', enabled: true },
                        { label: 'Daily Reports', desc: 'End-of-day summary email', enabled: false },
                        { label: 'Attendance Alerts', desc: 'When attendance drops below threshold', enabled: true },
                    ].map((pref) => (
                        <div key={pref.label} className="flex items-center justify-between py-3 border-b last:border-0">
                            <div>
                                <p className="font-medium">{pref.label}</p>
                                <p className="text-sm text-gray-500">{pref.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked={pref.enabled} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
