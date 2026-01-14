import { useEffect, useRef, useState } from 'react'
import { FiSearch, FiCrosshair } from 'react-icons/fi'
import toast from 'react-hot-toast'

export interface AddressDetails {
    address: string
    city: string
    state: string
    pincode: string
}

interface LocationPickerProps {
    latitude?: number
    longitude?: number
    onLocationSelect: (lat: number, lng: number) => void
    onAddressSelect?: (details: AddressDetails) => void
}

declare global {
    interface Window {
        google: any
    }
}

export default function LocationPicker({ latitude, longitude, onLocationSelect, onAddressSelect }: LocationPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const mapInstance = useRef<any>(null)
    const markerRef = useRef<any>(null)
    const autocompleteRef = useRef<any>(null)
    const geocoderRef = useRef<any>(null)
    const [mapError, setMapError] = useState(false)
    const [isLocating, setIsLocating] = useState(false)

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

            geocoderRef.current = new window.google.maps.Geocoder()

            // Add Click Listener
            mapInstance.current.addListener('click', (e: any) => {
                const lat = e.latLng.lat()
                const lng = e.latLng.lng()
                updateMarker(lat, lng)
                onLocationSelect(lat, lng)
                geocodePosition(lat, lng)
            })
        }

        // Initialize Autocomplete
        if (searchInputRef.current && !autocompleteRef.current && window.google.maps.places) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
                fields: ['geometry', 'name', 'address_components', 'formatted_address'],
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

                // Extract address directly from place result if available, otherwise geocode
                if (onAddressSelect) {
                    const details = extractAddressDetails(place)
                    onAddressSelect(details)
                }
            })
        }

        // Initialize Marker if coordinates exist
        if (latitude && longitude) {
            updateMarker(parseFloat(String(latitude)), parseFloat(String(longitude)), false)
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

    const updateMarker = (lat: number, lng: number, shouldGeocode = true) => {
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
                if (shouldGeocode) {
                    geocodePosition(newLat, newLng)
                }
            })
        }
        if (shouldGeocode) {
            geocodePosition(lat, lng)
        }
    }

    const geocodePosition = (lat: number, lng: number) => {
        if (!geocoderRef.current || !onAddressSelect) return

        geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
            if (status === 'OK' && results[0]) {
                const details = extractAddressDetails(results[0])
                onAddressSelect(details)
            }
        })
    }

    const extractAddressDetails = (place: any): AddressDetails => {
        let city = ''
        let state = ''
        let pincode = ''

        // Loop through address components to find specific types
        if (place.address_components) {
            for (const component of place.address_components) {
                const types = component.types

                if (types.includes('locality')) {
                    city = component.long_name
                }

                // Fallback for city if locality is missing
                if (!city && types.includes('administrative_area_level_2')) {
                    city = component.long_name
                }

                if (types.includes('administrative_area_level_1')) {
                    state = component.long_name
                }

                if (types.includes('postal_code')) {
                    pincode = component.long_name
                }
            }
        }

        return {
            address: place.formatted_address || '',
            city,
            state,
            pincode
        }
    }

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser")
            return
        }

        setIsLocating(true)
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude
                const lng = position.coords.longitude

                if (mapInstance.current) {
                    mapInstance.current.setCenter({ lat, lng })
                    mapInstance.current.setZoom(17)
                    updateMarker(lat, lng)
                    onLocationSelect(lat, lng)
                    geocodePosition(lat, lng)
                }
                setIsLocating(false)
            },
            (error) => {
                console.error("Error getting location:", error)
                toast.error("Unable to retrieve your location")
                setIsLocating(false)
            }
        )
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                </div>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for a location (e.g. School Name, Address)..."
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm text-gray-900 placeholder-gray-400"
                />
                <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Use my current location"
                >
                    <FiCrosshair className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="relative w-full h-[300px] rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <div ref={mapRef} className="w-full h-full" />
            </div>
            <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                <span>Search, click on the map, or drag the marker to set the location.</span>
            </p>
        </div>
    )
}
