import { FiTruck, FiUsers, FiCheckCircle } from 'react-icons/fi'

interface BusOverviewProps {
    bus: any
    liveStatus?: any
}

export default function BusOverview({ bus, liveStatus }: BusOverviewProps) {
    const InfoRow = ({ label, value }: { label: string, value: any }) => (
        <div className="grid grid-cols-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-2 rounded-md">
            <span className="text-sm text-gray-500 font-medium">{label}</span>
            <span className="text-sm text-gray-900 col-span-2 font-medium">{value || '-'}</span>
        </div>
    )

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 max-w-7xl mx-auto">
            {/* Left Column: Vehicle Details */}
            <div className="lg:col-span-2 space-y-8">
                {/* Vehicle Specs */}
                <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiTruck className="text-gray-400" />
                        Vehicle Specifications
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-2">
                            <InfoRow label="Make & Model" value={`${bus.make || ''} ${bus.model || ''}`} />
                            <InfoRow label="Year" value={bus.year} />
                            <InfoRow label="Capacity" value={`${bus.capacity} Seats`} />
                            <InfoRow label="Fuel Type" value={bus.fuel_type} />
                            <InfoRow label="Registration" value={bus.registration_number} />
                        </div>
                    </div>
                </section>

                {/* Compliance Info */}
                <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiCheckCircle className="text-gray-400" />
                        Compliance & Maintenance
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-2">
                            <InfoRow label="Insurance Expiry" value={bus.insurance_expiry_date} />
                            <InfoRow label="Fitness Expiry" value={bus.fitness_expiry_date} />
                            <InfoRow label="Last Maintenance" value={bus.last_maintenance_date} />
                            <InfoRow label="Next Service Due" value={bus.next_service_date || 'Not Scheduled'} />
                        </div>
                    </div>
                </section>
            </div>

            {/* Right Column: Crew & Status */}
            <div className="space-y-8">
                {/* Crew Card */}
                <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiUsers className="text-gray-400" />
                        Assigned Crew
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Driver</p>
                                <p className="text-base font-medium text-gray-900 mt-1">{bus.driver_name || 'Not Assigned'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <FiUserIcon />
                            </div>
                        </div>
                        <div className="border-t border-gray-100 my-4" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Conductor</p>
                                <p className="text-base font-medium text-gray-900 mt-1">{bus.conductor_name || 'Not Assigned'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <FiUserIcon />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Current Status / Live Trip */}
                {liveStatus?.has_active_trip && (
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FiActivityIcon />
                            Live Telemetry
                        </h3>
                        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm bg-green-50/50">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <h4 className="font-semibold text-green-900">En Route: {liveStatus.trip?.route_name}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-green-700 uppercase">Speed</p>
                                    <p className="text-xl font-mono font-bold text-green-900">{liveStatus.location?.speed || 0} km/h</p>
                                </div>
                                <div>
                                    <p className="text-xs text-green-700 uppercase">Students</p>
                                    <p className="text-xl font-mono font-bold text-green-900">
                                        {liveStatus.trip?.students_boarded}/{liveStatus.trip?.total_students}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}

function FiUserIcon() {
    return <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
}

function FiActivityIcon() {
    return <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
}
