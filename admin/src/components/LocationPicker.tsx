import { useEffect, useRef, useState } from 'react'

interface LocationPickerProps {
    latitude?: number
    longitude?: number
    onLocationSelect: (lat: number, lng: number) => void
}

declare global {
    interface Window {
        google: any
    }
}

export default function LocationPicker({ latitude, longitude, onLocationSelect }: LocationPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const mapInstance = useRef<any>(null)
    const markerRef = useRef<any>(null)
    const autocompleteRef = useRef<any>(null)
    const [mapError, setMapError] = useState(false)

    // Initialize Map and Autocomplete
    useEffect(() => {
        if (!mapRef.current) return

        if (!window.google || !window.google.maps) {
            setMapError(true)
            return
        }

        const defaultCenter = { lat: 28.6139, lng: 77.2090 } // New Delhi
        const initialCenter = latitude && longitude ? { lat: parseFloat(String(latitude)), lng: parseFloat(String(longitude)) } : defaultCenter

        if (!mapInstance.current) {
            mapInstance.current = new window.google.maps.Map(mapRef.current, {
                center: initialCenter,
                zoom: 15,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
            })

            // Add Click Listener
            mapInstance.current.addListener('click', (e: any) => {
                const lat = e.latLng.lat()
                const lng = e.latLng.lng()
                updateMarker(lat, lng)
                onLocationSelect(lat, lng)
            })
        }

        // Initialize Autocomplete
        if (searchInputRef.current && !autocompleteRef.current && window.google.maps.places) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
                fields: ['geometry', 'name'],
            })

            // Bind Autocomplete to Map
            autocompleteRef.current.bindTo('bounds', mapInstance.current)

            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current.getPlace()

                if (!place.geometry || !place.geometry.location) {
                    return
                }

                // If the place has a geometry, then present it on a map.
                if (place.geometry.viewport) {
                    mapInstance.current.fitBounds(place.geometry.viewport)
                } else {
                    mapInstance.current.setCenter(place.geometry.location)
                    mapInstance.current.setZoom(17)
                }

                const lat = place.geometry.location.lat()
                const lng = place.geometry.location.lng()
                updateMarker(lat, lng)
                onLocationSelect(lat, lng)
            })
        }

        // Initialize Marker if coordinates exist
        if (latitude && longitude) {
            updateMarker(parseFloat(String(latitude)), parseFloat(String(longitude)))
        }

    }, [])

    // Update marker position when props change
    useEffect(() => {
        if (latitude && longitude && mapInstance.current) {
            const lat = parseFloat(String(latitude))
            const lng = parseFloat(String(longitude))
            updateMarker(lat, lng)
            mapInstance.current.panTo({ lat, lng })
        }
    }, [latitude, longitude])

    const updateMarker = (lat: number, lng: number) => {
        if (!window.google) return

        if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng })
        } else {
            markerRef.current = new window.google.maps.Marker({
                position: { lat, lng },
                map: mapInstance.current,
                draggable: true,
                animation: window.google.maps.Animation.DROP,
            })

            markerRef.current.addListener('dragend', (e: any) => {
                const newLat = e.latLng.lat()
                const newLng = e.latLng.lng()
                onLocationSelect(newLat, newLng)
            })
        }
    }

    if (mapError) {
        return (
            <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                Google Maps API not loaded
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for a location (e.g. School Name, Address)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
                />
            </div>
            <div className="relative w-full h-[300px] rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <div ref={mapRef} className="w-full h-full" />
            </div>
            <p className="text-xs text-gray-500 text-center">
                Search, click on the map, or drag the marker to set the location.
            </p>
        </div>
    )
}
