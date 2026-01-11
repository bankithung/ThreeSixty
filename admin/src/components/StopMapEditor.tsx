import { useEffect, useRef, useState, useMemo } from 'react'
import { FiSearch, FiMapPin, FiPlus, FiSave, FiTrash2, FiEdit2 } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Stop {
    id?: string
    name: string
    latitude: number
    longitude: number
    order: number
    address?: string
}

interface StopMapEditorProps {
    stops: Stop[]
    onSave: (stops: Stop[]) => void
    isSaving?: boolean
}

declare global {
    interface Window {
        google: any
    }
}

export default function StopMapEditor({ stops: initialStops, onSave, isSaving }: StopMapEditorProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<any>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<any>(null)
    const markersRef = useRef<any[]>([])
    const polylineRef = useRef<any>(null)

    // Convert lat/lng to numbers (backend sends as strings)
    const normalizedStops = useMemo(() => initialStops.map(stop => ({
        ...stop,
        latitude: typeof stop.latitude === 'string' ? parseFloat(stop.latitude) : stop.latitude,
        longitude: typeof stop.longitude === 'string' ? parseFloat(stop.longitude) : stop.longitude,
    })), [initialStops])

    const [stops, setStops] = useState<Stop[]>(normalizedStops)

    // Sync state when props change (e.g. when data loads)
    useEffect(() => {
        setStops(normalizedStops)
    }, [normalizedStops])

    const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
    const [isAddingMode, setIsAddingMode] = useState(false)

    // Initialize Map (once)
    useEffect(() => {
        if (!mapRef.current || !window.google || mapInstance.current) return

        const defaultCenter = stops.length > 0
            ? { lat: stops[0].latitude, lng: stops[0].longitude }
            : { lat: 28.6139, lng: 77.2090 } // New Delhi default

        mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 13,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }],
                },
            ],
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: false,
        })

        // Initialize Search Autocomplete
        if (searchInputRef.current) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current)
            autocompleteRef.current.bindTo('bounds', mapInstance.current)

            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current.getPlace()
                if (!place.geometry || !place.geometry.location) {
                    toast.error("No details available for input: '" + place.name + "'")
                    return
                }

                if (place.geometry.viewport) {
                    mapInstance.current.fitBounds(place.geometry.viewport)
                } else {
                    mapInstance.current.setCenter(place.geometry.location)
                    mapInstance.current.setZoom(17)
                }

                // If in adding mode, prompt to add stop here
                if (isAddingMode) {
                    handleAddStop(place.geometry.location.lat(), place.geometry.location.lng(), place.name, place.formatted_address)
                }
            })
        }
    }, [])

    // Map Click Listener - updates when isAddingMode changes
    useEffect(() => {
        if (!mapInstance.current) return

        const clickListener = mapInstance.current.addListener('click', (e: any) => {
            console.log('Map clicked!', { isAddingMode, lat: e.latLng.lat(), lng: e.latLng.lng() })
            if (isAddingMode) {
                handleAddStop(e.latLng.lat(), e.latLng.lng())
            } else {
                setSelectedStopId(null)
            }
        })

        // Cleanup: remove old listener when isAddingMode changes
        return () => {
            window.google.maps.event.removeListener(clickListener)
        }
    }, [isAddingMode])

    // Update Markers & Polyline when stops change
    useEffect(() => {
        if (!mapInstance.current || !window.google) return

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null))
        markersRef.current = []

        // Clear existing polyline
        if (polylineRef.current) {
            polylineRef.current.setMap(null)
        }

        // Add Markers
        stops.forEach((stop, index) => {
            const marker = new window.google.maps.Marker({
                position: { lat: stop.latitude, lng: stop.longitude },
                map: mapInstance.current,
                label: {
                    text: (index + 1).toString(),
                    color: 'white',
                    fontWeight: 'bold',
                },
                draggable: true,
                animation: window.google.maps.Animation.DROP,
                title: stop.name,
            })

            // Drag End Listener with debounce/update
            marker.addListener('dragend', (e: any) => {
                handleStopMove(index, e.latLng.lat(), e.latLng.lng())
            })

            // Click listener
            marker.addListener('click', () => {
                setSelectedStopId(stop.id || `temp-${index}`)
                mapInstance.current.panTo(marker.getPosition())
            })

            markersRef.current.push(marker)
        })

        // Draw Polyline
        const path = stops.map(stop => ({ lat: stop.latitude, lng: stop.longitude }))
        polylineRef.current = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3B82F6', // Blue-500
            strokeOpacity: 0.8,
            strokeWeight: 4,
            icons: [{
                icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                offset: '100%',
                repeat: '100px'
            }],
        })
        polylineRef.current.setMap(mapInstance.current)

    }, [stops])

    // Toggle Adding Mode (and sync state)
    useEffect(() => {
        if (!mapInstance.current) return
        mapInstance.current.setOptions({
            draggableCursor: isAddingMode ? 'crosshair' : 'grab'
        })
    }, [isAddingMode])


    // Handlers
    const handleAddStop = async (lat: number, lng: number, name?: string, address?: string) => {
        // Reverse Geocode if name not provided
        if (!name) {
            const geocoder = new window.google.maps.Geocoder()
            try {
                const response = await geocoder.geocode({ location: { lat, lng } })
                if (response.results[0]) {
                    name = response.results[0].address_components[0].short_name // e.g. "123"
                    address = response.results[0].formatted_address
                }
            } catch (e) {
                console.error("Geocoding failed", e)
            }
        }

        const newStop: Stop = {
            id: `temp-${Date.now()}`, // Temp ID
            name: name || `Stop ${stops.length + 1}`,
            latitude: lat,
            longitude: lng,
            order: stops.length + 1,
            address: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }

        setStops([...stops, newStop])
        toast.success('Stop added')
        setIsAddingMode(false) // Exit adding mode after adding
    }

    const handleStopMove = (index: number, lat: number, lng: number) => {
        const newStops = [...stops]
        newStops[index] = { ...newStops[index], latitude: lat, longitude: lng }
        setStops(newStops)
    }

    const handleDeleteStop = (index: number) => {
        const newStops = stops.filter((_, i) => i !== index)
        // Re-index orders
        const reorderedStops = newStops.map((stop, i) => ({ ...stop, order: i + 1 }))
        setStops(reorderedStops)
    }

    return (
        <div className="flex h-[600px] bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            {/* Sidebar List */}
            <div className="w-80 flex flex-col border-r border-gray-200 bg-gray-50">
                <div className="p-4 border-b bg-white">
                    <h3 className="font-semibold text-gray-800">Manage Stops</h3>
                    <p className="text-xs text-gray-500">{stops.length} stops in route</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {Array.isArray(stops) && stops.map((stop, index) => (
                        <div
                            key={stop.id || index}
                            className={`p-3 rounded-lg border transition-colors cursor-pointer group ${(selectedStopId === stop.id || selectedStopId === `temp-${index}`)
                                ? 'bg-blue-50 border-blue-200 shadow-sm'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                                }`}
                            onClick={() => {
                                setSelectedStopId(stop.id || `temp-${index}`)
                                mapInstance.current?.panTo({ lat: stop.latitude, lng: stop.longitude })
                                mapInstance.current?.setZoom(16)
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="relative group/input">
                                        <input
                                            type="text"
                                            value={stop.name}
                                            onChange={(e) => {
                                                const newStops = [...stops]
                                                newStops[index].name = e.target.value
                                                setStops(newStops)
                                            }}
                                            className="w-full text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 hover:bg-gray-100 rounded px-1 -ml-1 transition-colors"
                                            placeholder="Stop name..."
                                        />
                                        <FiEdit2 className="absolute right-0 top-0.5 text-gray-400 opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none" size={12} />
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-1">{stop.address}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteStop(index)
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                    ))}

                    {stops.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No stops added yet.<br />Use the map to add stops.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white space-y-3">
                    <button
                        onClick={() => {
                            console.log('Toggle adding mode:', !isAddingMode)
                            setIsAddingMode(!isAddingMode)
                        }}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isAddingMode
                            ? 'bg-blue-600 text-white shadow-inner'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {isAddingMode ? <><FiMapPin /> Click Map to Add</> : <><FiPlus /> Add New Stop</>}
                    </button>

                    <button
                        onClick={() => {
                            console.log('Saving route with stops:', stops)
                            onSave(stops)
                        }}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                    >
                        {isSaving ? <span className="animate-spin">⏳</span> : <FiSave />}
                        Save Route
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                <div ref={mapRef} className="w-full h-full" />

                {/* Search Overlay */}
                <div className="absolute top-4 left-4 right-16 z-10 max-w-md">
                    <div className="relative bg-white rounded-lg shadow-lg">
                        <FiSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search location to add stop..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg outline-none text-sm"
                        />
                    </div>
                </div>

                {/* Helper Toast/Indicator */}
                {isAddingMode && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-bounce">
                        Click anywhere on the map to add a stop
                    </div>
                )}
            </div>
        </div>
    )
}
