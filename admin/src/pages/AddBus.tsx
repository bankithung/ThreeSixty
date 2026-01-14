
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import {
    FiArrowLeft, FiUpload, FiX, FiCheck, FiTruck,
    FiUser, FiMapPin, FiCalendar, FiAlertCircle
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { busesAPI, schoolsAPI, staffAPI, routesAPI, studentsAPI } from '../lib/api'
import StopMapEditor from '../components/StopMapEditor'

// Form Types
type BusFormData = {
    // School
    school_id: string

    // Basic Details
    number: string
    registration_number: string
    capacity: number
    is_active: boolean

    // Vehicle Details
    make: string
    model: string
    year: string
    color: string
    fuel_type: string
    purchase_date: string

    // Compliance
    insurance_expiry_date: string
    fitness_expiry_date: string
    last_maintenance_date: string

    // Staff
    driver_id: string
    conductor_id: string

    // Route & Students
    route_id: string
    student_ids: string[]
}

export default function AddBus() {
    const navigate = useNavigate()
    const [images, setImages] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Route Creation State
    const [isCreatingRoute, setIsCreatingRoute] = useState(false)
    const [newRouteName, setNewRouteName] = useState('')
    const [newRouteStops, setNewRouteStops] = useState<any[]>([])

    // Form Setup
    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<BusFormData>({
        defaultValues: {
            is_active: true,
            capacity: 40,
            fuel_type: 'diesel',
            student_ids: []
        }
    })

    const selectedSchoolId = watch('school_id')
    const selectedRouteId = watch('route_id')

    // Fetch Data
    const { data: schoolsData } = useQuery({
        queryKey: ['schools'],
        queryFn: () => schoolsAPI.list()
    })

    const { data: driversData } = useQuery({
        queryKey: ['staff', 'driver', selectedSchoolId],
        queryFn: () => staffAPI.list({ role: 'driver', school_id: selectedSchoolId }),
        enabled: !!selectedSchoolId
    })

    const { data: conductorsData } = useQuery({
        queryKey: ['staff', 'conductor', selectedSchoolId],
        queryFn: () => staffAPI.list({ role: 'conductor', school_id: selectedSchoolId }),
        enabled: !!selectedSchoolId
    })

    const { data: routesData } = useQuery({
        queryKey: ['routes', 'unassigned', selectedSchoolId],
        queryFn: () => routesAPI.list({ school_id: selectedSchoolId, bus_id: 'null' }), // Assuming backend supports filtering unassigned by passing bus_id=null or similar. If not, we might need to fetch all and filter client side or add specific param
        enabled: !!selectedSchoolId
    })

    // Create a client-side filter for routes if backend API doesn't support explicit 'unassigned' param neatly
    // Ideally backend 'bus_id__isnull=True' via 'unassigned=true' would be best.
    // For now, let's assume requesting routes with `bus_id` parameter can filter.
    // Actually, looking at views.py:
    // if bus_id: queryset = queryset.filter(bus_id=bus_id)
    // It doesn't seem to support "unassigned".
    // We can fetch ALL routes for school and filter in frontend where `!route.bus`
    // Let's rely on standard list and filter:
    const unassignedRoutes = routesData?.data?.results?.filter((r: any) => !r.bus) || []

    const { data: unassignedStudentsData } = useQuery({
        queryKey: ['students', 'unassigned', selectedSchoolId],
        queryFn: () => studentsAPI.list({ school_id: selectedSchoolId, unassigned: 'true' }),
        enabled: !!selectedSchoolId
    })

    // Use optional filtering for route's students if needed, but here we want UNASSIGNED students to assign TO the new bus/route.
    // The requirement is "assign unassigned students".

    // Handlers
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            setImages(prev => [...prev, ...newFiles])

            const newPreviews = newFiles.map(file => URL.createObjectURL(file))
            setPreviews(prev => [...prev, ...newPreviews])
        }
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setPreviews(prev => prev.filter((_, i) => i !== index))
    }

    const onSubmit = async (data: BusFormData) => {
        setIsSubmitting(true)
        try {
            // 1. Create Bus
            const busResponse = await busesAPI.create({
                ...data,
                // Clean up empty strings to null or exclude
                purchase_date: data.purchase_date || null,
                insurance_expiry_date: data.insurance_expiry_date || null,
                fitness_expiry_date: data.fitness_expiry_date || null,
                last_maintenance_date: data.last_maintenance_date || null,
                driver_id: data.driver_id || null,
                conductor_id: data.conductor_id || null,
            })
            const newBusId = busResponse.data.id

            // 2. Route Assignment / Creation
            if (isCreatingRoute) {
                // Validate
                if (!newRouteName) throw new Error('Route name is required')
                if (newRouteStops.length === 0) throw new Error('At least one stop is required for new route')

                // Create Route
                const routeRes = await routesAPI.create({
                    school_id: data.school_id,
                    bus_id: newBusId,
                    name: newRouteName,
                    is_active: true
                })
                const newRouteId = routeRes.data.id

                // Add Stops
                await routesAPI.replaceStops(newRouteId, newRouteStops)

                // Assign Students to new route (if any selected - though currently UI only shows students for EXISTING routes usually? 
                // Wait, logic says "Assign Unassigned Students to this Route". 
                // If creating NEW route, we can still assign students to it.
                if (data.student_ids && data.student_ids.length > 0) {
                    // For new route, get stops (which we just added) to get IDs? 
                    // Or just assign to route and let stop be null/first?
                    // Let's refetch stops to get their IDs
                    const stopsRes = await routesAPI.getStops(newRouteId)
                    const firstStopId = stopsRes.data[0]?.id

                    const updatePromises = data.student_ids.map(studentId =>
                        studentsAPI.update(studentId, { route: newRouteId, stop: firstStopId })
                    )
                    await Promise.all(updatePromises)
                }

            } else if (data.route_id) {
                // Assign Existing Route
                await routesAPI.update(data.route_id, { bus_id: newBusId })

                // Assign Students
                if (data.student_ids && data.student_ids.length > 0) {
                    const stopsRes = await routesAPI.getStops(data.route_id)
                    const firstStopId = stopsRes.data[0]?.id

                    if (firstStopId) {
                        const updatePromises = data.student_ids.map(studentId =>
                            studentsAPI.update(studentId, { route: data.route_id, stop: firstStopId })
                        )
                        await Promise.all(updatePromises)
                    } else {
                        toast.error('Selected route has no stops. Students assigned to route without specific stop.')
                        const updatePromises = data.student_ids.map(studentId =>
                            studentsAPI.update(studentId, { route: data.route_id })
                        )
                        await Promise.all(updatePromises)
                    }
                }
            }

            // 4. Upload Images
            if (images.length > 0) {
                const uploadPromises = images.map(image => {
                    const formData = new FormData()
                    formData.append('image', image)
                    return busesAPI.uploadImage(newBusId, formData)
                })
                await Promise.all(uploadPromises)
            }

            toast.success('Bus created successfully!')
            navigate('/buses')
        } catch (error: any) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Failed to create bus')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/buses')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <FiArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add New Bus</h1>
                    <p className="text-gray-500">Register a new vehicle to the fleet</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">

                {/* 1. School & Basic Info */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <FiTruck className="text-primary-500" /> Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* School */}
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                            <Controller
                                name="school_id"
                                control={control}
                                rules={{ required: 'School is required' }}
                                render={({ field }: { field: any }) => (
                                    <select
                                        {...field}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="">Select School</option>
                                        {schoolsData?.data?.results?.map((school: any) => (
                                            <option key={school.id} value={school.id}>{school.name}</option>
                                        ))}
                                    </select>
                                )}
                            />
                            {errors.school_id && <p className="text-red-500 text-sm mt-1">{errors.school_id.message}</p>}
                        </div>

                        {/* Bus Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bus Number/Name</label>
                            <input
                                {...register('number', { required: 'Bus Number is required' })}
                                placeholder="e.g. Bus 101"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number.message}</p>}
                        </div>

                        {/* Reg Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                            <input
                                {...register('registration_number', { required: 'Registration Number is required' })}
                                placeholder="e.g. KA-01-HH-1234"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            {errors.registration_number && <p className="text-red-500 text-sm mt-1">{errors.registration_number.message}</p>}
                        </div>

                        {/* Capacity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                            <input
                                type="number"
                                {...register('capacity', { required: 'Capacity is required', min: 1 })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center h-full pt-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register('is_active')}
                                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <span className="text-gray-700 font-medium">Active Status</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. Vehicle Details */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <FiTruck className="text-primary-500" /> Vehicle Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <input {...register('make')} placeholder="Make (e.g. Tata)" className="px-4 py-2 border rounded-lg" />
                        <input {...register('model')} placeholder="Model" className="px-4 py-2 border rounded-lg" />
                        <input type="number" {...register('year')} placeholder="Year" className="px-4 py-2 border rounded-lg" />
                        <input {...register('color')} placeholder="Color" className="px-4 py-2 border rounded-lg" />
                        <select {...register('fuel_type')} className="px-4 py-2 border rounded-lg">
                            <option value="diesel">Diesel</option>
                            <option value="petrol">Petrol</option>
                            <option value="cng">CNG</option>
                            <option value="electric">Electric</option>
                        </select>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Purchase Date</label>
                            <input type="date" {...register('purchase_date')} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                    </div>
                </div>

                {/* 3. Compliance & Maintenance (NEW) */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <FiAlertCircle className="text-orange-500" /> Compliance & Documents
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
                            <div className="relative">
                                <FiCalendar className="absolute left-3 top-3 text-gray-400" />
                                <input type="date" {...register('insurance_expiry_date')} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fitness Expiry</label>
                            <div className="relative">
                                <FiCalendar className="absolute left-3 top-3 text-gray-400" />
                                <input type="date" {...register('fitness_expiry_date')} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Maintenance</label>
                            <div className="relative">
                                <FiCalendar className="absolute left-3 top-3 text-gray-400" />
                                <input type="date" {...register('last_maintenance_date')} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Staff Assignment */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <FiUser className="text-blue-500" /> Staff Assignment
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Driver</label>
                            <select
                                {...register('driver_id')}
                                className="w-full px-4 py-2 border rounded-lg outline-none"
                                disabled={!selectedSchoolId}
                            >
                                <option value="">Select Driver</option>
                                {driversData?.data?.results?.map((d: any) => (
                                    <option key={d.user.id} value={d.user.id}>{d.user.full_name} ({d.user.phone})</option>
                                ))}
                            </select>
                            {!selectedSchoolId && <p className="text-xs text-gray-500 mt-1">Select school first</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Conductor</label>
                            <select
                                {...register('conductor_id')}
                                className="w-full px-4 py-2 border rounded-lg outline-none"
                                disabled={!selectedSchoolId}
                            >
                                <option value="">Select Conductor</option>
                                {conductorsData?.data?.results?.map((c: any) => (
                                    <option key={c.user.id} value={c.user.id}>{c.user.full_name} ({c.user.phone})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 5. Route & Students */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <FiMapPin className="text-green-500" /> Route Assignment
                    </h2>

                    <div className="flex bg-gray-100 p-1 rounded-lg mb-6 w-fit">
                        <button
                            type="button"
                            onClick={() => setIsCreatingRoute(false)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!isCreatingRoute ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Assign Existing Route
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreatingRoute(true)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isCreatingRoute ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Create New Route
                        </button>
                    </div>

                    <div className="space-y-6">
                        {!isCreatingRoute ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Route</label>
                                    <select
                                        {...register('route_id')}
                                        className="w-full px-4 py-2 border rounded-lg outline-none"
                                        disabled={!selectedSchoolId}
                                    >
                                        <option value="">Select Existing Route (Unassigned)</option>
                                        {unassignedRoutes.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.name} (Stop count: {r.stop_count})</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Only unassigned routes are shown.</p>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Route Name</label>
                                    <input
                                        value={newRouteName}
                                        onChange={(e) => setNewRouteName(e.target.value)}
                                        placeholder="e.g. Route 5 - East City"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Define Stops</label>
                                    <div className="h-[500px] border rounded-xl overflow-hidden">
                                        <StopMapEditor
                                            stops={newRouteStops}
                                            onSave={() => { }} // Not used here, handled in submit
                                            hideSaveButton={true}
                                            onChange={setNewRouteStops}
                                            heightClass="h-full"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Use search or click on map to add stops. Drag to reorder. Stops will be saved when you create the bus.</p>
                                </div>
                            </div>
                        )}

                        {/* Student Assignment Section (Common) */}
                        {(selectedRouteId || isCreatingRoute) && (
                            <div className="pt-6 border-t">
                                <h3 className="text-sm font-semibold text-gray-800 mb-3">Assign Unassigned Students</h3>
                                <div className="border rounded-lg max-h-60 overflow-y-auto p-2 bg-gray-50">
                                    {unassignedStudentsData?.data?.results?.length > 0 ? (
                                        <div className="space-y-2">
                                            {unassignedStudentsData?.data?.results?.map((student: any) => (
                                                <label key={student.id} className="flex items-center gap-3 p-2 bg-white rounded border hover:bg-blue-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value={student.id}
                                                        {...register('student_ids')}
                                                        className="w-4 h-4 text-primary-600 rounded"
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{student.full_name}</p>
                                                        <p className="text-xs text-gray-500">{student.grade} - {student.section} | Admn: {student.admission_number}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-400 py-4">No unassigned students found for this school.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. Images */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <FiUpload className="text-purple-500" /> Bus Images
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {previews.map((src, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                                <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                    <FiX size={14} />
                                </button>
                            </div>
                        ))}

                        <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors">
                            <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">Upload Photos</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FiCheck />
                        )}
                        {isSubmitting ? 'Creating...' : 'Create Bus'}
                    </button>
                </div>

            </form>
        </div>
    )
}
