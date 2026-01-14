import { useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI, routesAPI, busesAPI } from '../../../lib/api'
import { FiSearch, FiX, FiCheck, FiMapPin } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface AssignStudentModalProps {
    busId: string
    isOpen: boolean
    onClose: () => void
}

export default function AssignStudentModal({ busId, isOpen, onClose }: AssignStudentModalProps) {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    const [selectedRoute, setSelectedRoute] = useState<any>(null)
    const [selectedStop, setSelectedStop] = useState<any>(null)

    // 1. Fetch Routes for this Bus
    const { data: routesData } = useQuery({
        queryKey: ['busRoutes', busId],
        queryFn: () => routesAPI.list({ bus_id: busId, include_stops: 'true' }),
        enabled: isOpen
    })
    const routes = routesData?.data?.results || routesData?.data || []

    // 1b. Fetch Stops when Route is selected
    const { data: stopsData } = useQuery({
        queryKey: ['routeStops', selectedRoute?.id],
        queryFn: () => routesAPI.getStops(selectedRoute.id),
        enabled: !!selectedRoute?.id
    })
    const stops = Array.isArray(stopsData?.data) ? stopsData.data : (Array.isArray(stopsData) ? stopsData : [])


    // 2. Search Students (Unassigned preferred, but list all for now to filter)
    const { data: studentsData } = useQuery({
        queryKey: ['searchStudents', searchTerm],
        queryFn: () => studentsAPI.list({ search: searchTerm }),
        enabled: searchTerm.length > 2
    })
    const searchResults = studentsData?.data?.results || studentsData?.data || []


    // 3. Mutation to Assign
    const assignMutation = useMutation({
        mutationFn: () => busesAPI.assignStudentToStop(selectedStudent.id, selectedStop.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['busStudents', busId] })
            toast.success('Student assigned successfully')
            handleClose()
        },
        onError: (err) => {
            console.error(err)
            toast.error('Failed to assign student')
        }
    })

    const handleClose = () => {
        setSearchTerm('')
        setSelectedStudent(null)
        setSelectedRoute(null)
        setSelectedStop(null)
        onClose()
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Assign Student to Bus
                                    </Dialog.Title>
                                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                                        <FiX size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Step 1: Select Student */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Student</label>
                                        {!selectedStudent ? (
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by name or admission no..."
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                                {searchResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto z-10">
                                                        {searchResults.map((student: any) => (
                                                            <button
                                                                key={student.id}
                                                                onClick={() => { setSelectedStudent(student); setSearchTerm('') }}
                                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                                                            >
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{student.first_name} {student.last_name}</p>
                                                                    <p className="text-xs text-gray-500">{student.admission_number}</p>
                                                                </div>
                                                                {student.stop && <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Has Stop</span>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                                        {selectedStudent.first_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-blue-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                                                        <p className="text-xs text-blue-700">{selectedStudent.admission_number}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedStudent(null)} className="text-blue-500 hover:text-blue-700">Change</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 2: Select Route */}
                                    <div className={!selectedStudent ? 'opacity-50 pointer-events-none' : ''}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">2. Select Route</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {routes.map((route: any) => (
                                                <button
                                                    key={route.id}
                                                    onClick={() => { setSelectedRoute(route); setSelectedStop(null) }}
                                                    className={`p-3 border rounded-lg text-left transition-all ${selectedRoute?.id === route.id
                                                            ? 'border-black ring-1 ring-black bg-gray-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <p className="font-medium text-gray-900">{route.name}</p>
                                                    <p className="text-xs text-gray-500">{route.stops_count} stops</p>
                                                </button>
                                            ))}
                                            {routes.length === 0 && <p className="text-sm text-gray-500">No routes found for this bus.</p>}
                                        </div>
                                    </div>

                                    {/* Step 3: Select Stop */}
                                    <div className={!selectedRoute ? 'opacity-50 pointer-events-none' : ''}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">3. Select Stop</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                            value={selectedStop?.id || ''}
                                            onChange={(e) => setSelectedStop(stops.find((s: any) => s.id === e.target.value))}
                                            disabled={!selectedRoute}
                                        >
                                            <option value="">Select a stop...</option>
                                            {stops.map((stop: any) => (
                                                <option key={stop.id} value={stop.id}>
                                                    {stop.name} {stop.address ? `(${stop.address})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                                            onClick={handleClose}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            onClick={() => assignMutation.mutate()}
                                            disabled={!selectedStudent || !selectedStop || assignMutation.isPending}
                                        >
                                            {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
                                            {!assignMutation.isPending && <FiCheck />}
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
