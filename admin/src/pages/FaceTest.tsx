import { useState, useRef, useEffect, useCallback } from 'react'
import { studentsAPI } from '../lib/api'
import { FiCamera, FiUser, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface IdentifiedStudent {
    id: string
    full_name: string
    admission_number: string
    grade: string
    section: string
    photo: string | null
}

export default function FaceTest() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [identifiedStudent, setIdentifiedStudent] = useState<IdentifiedStudent | null>(null)
    const [confidence, setConfidence] = useState<number>(0)
    const [isScanning, setIsScanning] = useState(false)
    const [lastScanTime, setLastScanTime] = useState<number>(0)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

    // Start camera
    const startCamera = async () => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
            })

            if (videoRef.current) {
                videoRef.current.srcObject = newStream
                setStream(newStream)
                setIsCameraActive(true)
                setIdentifiedStudent(null)
            }
        } catch (error) {
            console.error('Error accessing camera:', error)
            toast.error('Could not access camera')
        }
    }

    // Stop camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
            setIsCameraActive(false)
            setIsScanning(false)
        }
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [stream])

    // Re-start camera when facing mode changes
    useEffect(() => {
        if (isCameraActive) {
            startCamera()
        }
    }, [facingMode])

    // Capture and identify
    const captureAndIdentify = useCallback(async () => {
        if (!videoRef.current || !isCameraActive || isScanning) return

        // Rate limit: scan every 1.5 seconds
        const now = Date.now()
        if (now - lastScanTime < 1500) return

        setIsScanning(true)
        setLastScanTime(now)

        try {
            const video = videoRef.current
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            const context = canvas.getContext('2d')
            if (!context) return

            // If using front camera, mirror the image horizontally
            if (facingMode === 'user') {
                context.translate(canvas.width, 0)
                context.scale(-1, 1)
            }

            context.drawImage(video, 0, 0, canvas.width, canvas.height)

            canvas.toBlob(async (blob) => {
                if (!blob) return

                const formData = new FormData()
                formData.append('photo', blob, 'capture.jpg')

                try {
                    const response = await studentsAPI.identifyStudent(formData)

                    if (response.data.identified) {
                        setIdentifiedStudent(response.data.student)
                        setConfidence(response.data.confidence)
                        // Trigger haptic feedback if available
                        if (navigator.vibrate) navigator.vibrate(200)
                    } else {
                        // Only clear if we haven't found a match recently (optional persistence)
                        // For now, let's keep the last match visible for a bit
                        // setIdentifiedStudent(null) 
                    }
                } catch (error) {
                    console.error('Identification error:', error)
                } finally {
                    setIsScanning(false)
                }
            }, 'image/jpeg', 0.8)

        } catch (error) {
            console.error('Capture error:', error)
            setIsScanning(false)
        }
    }, [isCameraActive, isScanning, lastScanTime, facingMode])

    // Scanning loop
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>

        if (isCameraActive) {
            intervalId = setInterval(() => {
                captureAndIdentify()
            }, 1000)
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [isCameraActive, captureAndIdentify])

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-6 mt-4">Face Recognition Check</h1>

            <div className="relative w-full max-w-lg aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800">
                {/* Camera View */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
                />

                {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                        <button
                            onClick={startCamera}
                            className="flex items-center gap-2 px-6 py-3 bg-primary-600 rounded-full font-semibold hover:bg-primary-700 transition-all"
                        >
                            <FiCamera size={24} />
                            Start Camera
                        </button>
                    </div>
                )}

                {/* Scanning overlay */}
                {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Scanning Box */}
                        <div className="absolute inset-x-12 inset-y-24 border-2 border-primary-500/50 rounded-lg animate-pulse">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                        </div>

                        {/* Controls */}
                        <div className="absolute top-4 right-4 pointer-events-auto">
                            <button
                                onClick={toggleCamera}
                                className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-colors"
                            >
                                <FiRefreshCw size={20} />
                            </button>
                        </div>

                        <div className="absolute top-4 left-4 pointer-events-auto">
                            <button
                                onClick={stopCamera}
                                className="p-3 bg-red-500/80 text-white rounded-full backdrop-blur-md hover:bg-red-600 transition-colors"
                            >
                                <FiXCircle size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Result Overlay */}
                {identifiedStudent && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent p-6 pt-20 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl">
                            {identifiedStudent.photo ? (
                                <img
                                    src={identifiedStudent.photo}
                                    alt={identifiedStudent.full_name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-green-500"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-2 border-green-500">
                                    <FiUser size={32} className="text-gray-400" />
                                </div>
                            )}

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold text-white leading-none">
                                        {identifiedStudent.full_name}
                                    </h2>
                                    <FiCheckCircle className="text-green-500" />
                                </div>
                                <p className="text-sm text-gray-300">
                                    {identifiedStudent.grade} - {identifiedStudent.section} (#{identifiedStudent.admission_number})
                                </p>
                                <p className="text-xs text-green-400 mt-1 font-mono">
                                    Match Confidence: {(confidence * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <p className="text-gray-500 mt-4 text-sm text-center max-w-xs">
                Position face within the frame. Ensure good lighting.
            </p>
        </div>
    )
}
