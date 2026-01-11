import { useEffect, useRef } from 'react'

interface Location {
    latitude: number
    longitude: number
    speed: number
    heading: number
    timestamp: string
}

interface Trip {
    id: string
    bus_number: string
    route_name: string
    trip_type: string
    latest_location: Location | null
}

interface LiveMapProps {
    trips: Trip[]
}

declare global {
    interface Window {
        google: any
    }
}

export default function LiveMap({ trips }: LiveMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<any>(null)
    const markersRef = useRef<{ [key: string]: any }>({})

    // Initialize Map
    useEffect(() => {
        if (!mapRef.current || !window.google) return

        if (!mapInstance.current) {
            mapInstance.current = new window.google.maps.Map(mapRef.current, {
                center: { lat: 28.6139, lng: 77.2090 }, // Default: New Delhi
                zoom: 12,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }],
                    },
                ],
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
            })
        }
    }, [])

    // Update Markers
    useEffect(() => {
        if (!mapInstance.current || !window.google) return

        const activeTripIds = new Set(trips.map((t) => t.id))

        // Remove old markers
        Object.keys(markersRef.current).forEach((tripId) => {
            if (!activeTripIds.has(tripId)) {
                markersRef.current[tripId].setMap(null)
                delete markersRef.current[tripId]
            }
        })

        // Add/Update markers
        trips.forEach((trip) => {
            if (!trip.latest_location) return

            const position = {
                lat: trip.latest_location.latitude,
                lng: trip.latest_location.longitude,
            }

            if (markersRef.current[trip.id]) {
                // Update existing marker
                markersRef.current[trip.id].setPosition(position)
                // markersRef.current[trip.id].setIcon(getBusIcon(trip.latest_location.heading))
            } else {
                // Create new marker
                const marker = new window.google.maps.Marker({
                    position,
                    map: mapInstance.current,
                    title: `Bus ${trip.bus_number}`,
                    label: {
                        text: trip.bus_number,
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        className: 'bus-marker-label',
                    },
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 14,
                        fillColor: '#4CAF50',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                })

                // Info Window
                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
                        <div class="p-2">
                            <h3 class="font-bold">Bus ${trip.bus_number}</h3>
                            <p class="text-sm text-gray-600">${trip.route_name}</p>
                            <p class="text-xs mt-1">Speed: ${Math.round(trip.latest_location.speed)} km/h</p>
                        </div>
                    `,
                })

                marker.addListener('click', () => {
                    infoWindow.open(mapInstance.current, marker)
                })

                markersRef.current[trip.id] = marker
            }
        })

        // Fit bounds if we have trips with location
        if (trips.some(t => t.latest_location)) {
            const bounds = new window.google.maps.LatLngBounds()
            trips.forEach(t => {
                if (t.latest_location) {
                    bounds.extend({
                        lat: t.latest_location.latitude,
                        lng: t.latest_location.longitude
                    })
                }
            })
            // Only re-center if we haven't interacted much? strictly sticking to bounds for now
            // mapInstance.current.fitBounds(bounds)
        }

    }, [trips])

    return (
        <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-sm bg-gray-100">
            <div ref={mapRef} className="w-full h-full" />
            {!window.google && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                    <p className="text-gray-500">Loading Map...</p>
                </div>
            )}
        </div>
    )
}
