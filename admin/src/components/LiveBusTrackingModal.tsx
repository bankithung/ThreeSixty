import { Fragment, useState, useEffect, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { FiX, FiNavigation, FiClock, FiUsers, FiMaximize2, FiMinimize2 } from 'react-icons/fi'
import { busesAPI } from '../lib/api'
import { useQuery } from '@tanstack/react-query'

interface LiveBusTrackingModalProps {
    isOpen: boolean
    onClose: () => void
    busId: string
    busNumber: string
}

// Default center (India) - will update with bus location
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

// Map options to remove clutter
const GOOGLE_MAP_OPTIONS = {
    disableDefaultUI: false, // Keep default UI for zoom/street view
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
}

export default function LiveBusTrackingModal({ isOpen, onClose, busId, busNumber }: LiveBusTrackingModalProps) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDilPB9G_6IJAwdD734gs2S6BJZF_PE1ec'
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    })

    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    // const markerRef = useRef<google.maps.Marker | null>(null) // Removed unused ref

    // Poll for live status every 5 seconds
    const { data: liveData, isLoading, error } = useQuery({
        queryKey: ['busLive', busId],
        queryFn: () => busesAPI.getLiveStatus(busId),
        refetchInterval: 5000,
        enabled: isOpen && !!busId,
        retry: false // Don't retry indefinitely if 404 or 500
    })

    const liveStatus = liveData?.data
    const hasActiveTrip = liveStatus?.has_active_trip
    const location = liveStatus?.location
    const trip = liveStatus?.trip

    // Update map center when location loads for the first time or changes
    useEffect(() => {
        if (map && location && location.latitude && location.longitude) {
            const pos = { lat: location.latitude, lng: location.longitude }

            // Pan to new location smoothly
            map.panTo(pos)

            // Adjust zoom if too far out (initial load)
            if (map.getZoom()! < 15) {
                map.setZoom(15)
            }
        }
    }, [map, location])

    const onLoad = (mapInstance: google.maps.Map) => {
        setMap(mapInstance)
    }

    const onUnmount = () => {
        setMap(null)
    }

    // Handle missing API Key
    if (!apiKey) {
        return (
            <Transition show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="fixed inset-0 overflow-y-auto p-4">
                        <div className="flex min-h-full items-center justify-center">
                            <Dialog.Panel className="w-full max-w-md bg-white rounded-xl p-6 shadow-xl">
                                <div className="flex items-center gap-3 text-red-600 mb-4">
                                    <FiX className="w-6 h-6" />
                                    <h3 className="text-lg font-bold">Configuration Error</h3>
                                </div>
                                <p className="text-gray-600 mb-4">
                                    Google Maps API Key is missing. Please add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your environment variables.
                                </p>
                                <button onClick={onClose} className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-900 font-medium">
                                    Close
                                </button>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        )
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto w-screen p-4">
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
                            <Dialog.Panel
                                className={`w-full transform overflow-hidden rounded-2xl bg-white p-0 text-left align-middle shadow-xl transition-all flex flex-col ${isExpanded ? 'h-[90vh] max-w-[95vw]' : 'h-[600px] max-w-4xl'
                                    }`}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                            <FiNavigation className="w-5 h-5 animate-pulse" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                Live Tracking: {busNumber}
                                                {isLoading && <span className="text-xs font-normal text-gray-500">(Connecting...)</span>}
                                                {error && <span className="text-xs font-normal text-red-500">(Connection Failed)</span>}
                                            </Dialog.Title>
                                            <p className="text-sm text-gray-500">
                                                {hasActiveTrip
                                                    ? `On active trip: ${trip?.route_name || 'Unknown Route'}`
                                                    : error ? 'Unable to fetch bus status' : 'No active trip currently in progress'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsExpanded(!isExpanded)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title={isExpanded ? "Collapse" : "Expand"}
                                        >
                                            {isExpanded ? <FiMinimize2 className="w-5 h-5" /> : <FiMaximize2 className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Map Area */}
                                <div className="relative flex-1 bg-gray-100">
                                    {loadError ? (
                                        <div className="flex flex-col items-center justify-center h-full text-red-500 p-4 text-center">
                                            <p className="font-bold mb-2">Map Error</p>
                                            <p className="text-sm">{loadError.message}</p>
                                        </div>
                                    ) : isLoaded ? (
                                        hasActiveTrip && location ? (
                                            <GoogleMap
                                                mapContainerStyle={MAP_CONTAINER_STYLE}
                                                center={{ lat: location.latitude, lng: location.longitude }}
                                                zoom={15}
                                                onLoad={onLoad}
                                                onUnmount={onUnmount}
                                                options={GOOGLE_MAP_OPTIONS}
                                            >
                                                {/* Bus Marker */}
                                                <Marker
                                                    position={{ lat: location.latitude, lng: location.longitude }}
                                                    title={`Bus ${busNumber}`}
                                                    icon={{
                                                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                                        scale: 6,
                                                        fillColor: "#2563EB", // Blue
                                                        fillOpacity: 1,
                                                        strokeWeight: 2,
                                                        strokeColor: "#FFFFFF",
                                                        rotation: location.heading || 0,
                                                    }}
                                                />
                                            </GoogleMap>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                                {error ? (
                                                    <>
                                                        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-3">
                                                            <FiX className="w-8 h-8" />
                                                        </div>
                                                        <p className="font-medium text-lg text-gray-900">Connection Error</p>
                                                        <p className="text-sm mt-1 text-gray-500">Could not retrieve live status.</p>
                                                    </>
                                                ) : !isLoading && !hasActiveTrip ? (
                                                    <>
                                                        <div className="p-4 bg-gray-200 rounded-full mb-3">
                                                            <FiNavigation className="w-8 h-8 text-gray-400" />
                                                        </div>
                                                        <p className="font-medium text-lg">Trip Not Started</p>
                                                        <p className="text-sm mt-1 max-w-md text-center">
                                                            This bus is currently not on an active trip. Live tracking will be available once the conductor starts a trip.
                                                        </p>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                                        <p>Loading location data...</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">
                                            Loading Map...
                                        </div>
                                    )}

                                    {/* Overlay Info Card */}
                                    {hasActiveTrip && (
                                        <div className="absolute top-4 right-4 w-72 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Speed</span>
                                                    <span className="font-mono font-bold text-gray-900">{Math.round(location?.speed || 0)} km/h</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Since</span>
                                                    <span className="text-sm text-gray-900 flex items-center">
                                                        <FiClock className="mr-1.5 w-3.5 h-3.5 text-gray-400" />
                                                        {new Date(location?.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="h-px bg-gray-100 my-2" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Students</span>
                                                    <span className="text-sm text-gray-900 flex items-center font-medium">
                                                        <FiUsers className="mr-1.5 w-3.5 h-3.5 text-gray-400" />
                                                        {trip?.students_boarded || 0} / {trip?.total_students || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
