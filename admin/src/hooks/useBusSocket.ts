import { useEffect, useRef, useState, useCallback } from 'react'

interface LiveLocation {
    bus_id: string
    latitude: number
    longitude: number
    speed: number
    heading: number
    timestamp: string
}

interface LiveTrip {
    id: string
    trip_type: string
    status: string
    route_name: string | null
    driver_name: string | null
    conductor_name: string | null
    started_at: string | null
    total_students: number
    students_boarded: number
    students_dropped: number
}

interface LiveStudent {
    id: string
    name: string
    status: string
    boarded_at: string | null
    dropped_at: string | null
}

interface BusLiveStatus {
    has_active_trip: boolean
    trip: LiveTrip | null
    location: LiveLocation | null
    students: LiveStudent[]
}

interface UseBusSocketResult {
    liveStatus: BusLiveStatus | null
    isConnected: boolean
    error: string | null
    refresh: () => void
}

/**
 * Hook for real-time bus profile updates via WebSocket.
 * Connects to the bus profile WebSocket and receives live updates.
 */
export function useBusSocket(busId: string | undefined): UseBusSocketResult {
    const [liveStatus, setLiveStatus] = useState<BusLiveStatus | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

    const connect = useCallback(() => {
        if (!busId) return

        // Cleanup existing connection
        if (wsRef.current) {
            wsRef.current.close()
        }

        // Determine WebSocket URL - use backend server
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const wsProtocol = API_URL.startsWith('https') ? 'wss:' : 'ws:'
        const wsHost = API_URL.replace('http://', '').replace('https://', '')
        const wsUrl = `${wsProtocol}//${wsHost}/ws/bus/${busId}/profile/`

        try {
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log(`[BusSocket] Connected to bus ${busId}`)
                setIsConnected(true)
                setError(null)
            }

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data)

                    switch (message.type) {
                        case 'initial_data':
                        case 'refresh_data':
                            setLiveStatus(message.data)
                            break
                        case 'location_update':
                            setLiveStatus(prev => prev ? {
                                ...prev,
                                location: message.data
                            } : null)
                            break
                        case 'trip_status':
                            setLiveStatus(prev => prev ? {
                                ...prev,
                                trip: message.data.trip,
                                has_active_trip: message.data.has_active_trip
                            } : null)
                            break
                        case 'student_status':
                            setLiveStatus(prev => {
                                if (!prev) return null
                                const updatedStudents = prev.students.map(s =>
                                    s.id === message.data.student_id
                                        ? { ...s, status: message.data.status, ...message.data }
                                        : s
                                )
                                return { ...prev, students: updatedStudents }
                            })
                            break
                    }
                } catch (e) {
                    console.error('[BusSocket] Failed to parse message:', e)
                }
            }

            ws.onclose = (event) => {
                console.log(`[BusSocket] Disconnected from bus ${busId}`, event.code)
                setIsConnected(false)

                // Reconnect after 3 seconds (unless intentional close)
                if (event.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[BusSocket] Attempting reconnection...')
                        connect()
                    }, 3000)
                }
            }

            ws.onerror = (event) => {
                console.error('[BusSocket] WebSocket error:', event)
                setError('WebSocket connection error')
            }
        } catch (e) {
            console.error('[BusSocket] Failed to create WebSocket:', e)
            setError('Failed to connect')
        }
    }, [busId])

    // Connect on mount, cleanup on unmount
    useEffect(() => {
        connect()

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounted')
            }
        }
    }, [connect])

    // Manual refresh function
    const refresh = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'refresh' }))
        }
    }, [])

    return {
        liveStatus,
        isConnected,
        error,
        refresh
    }
}

export default useBusSocket
