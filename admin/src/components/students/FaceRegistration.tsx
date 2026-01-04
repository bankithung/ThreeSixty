import React, { useState, useRef } from 'react'
import { studentsAPI } from '../../lib/api'
import { FiUpload, FiCamera, FiAlertCircle, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface FaceRegistrationProps {
    studentId: string
    onSuccess?: () => void
}

const FaceRegistration: React.FC<FaceRegistrationProps> = ({ studentId, onSuccess }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Cleanup stream on unmount
    React.useEffect(() => {
        return () => {
            stopCamera()
        }
    }, [])

    const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
        // Stop any existing stream first
        stopCamera()

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }
            })
            streamRef.current = stream

            // We need to set the stream to the video element after a small delay to ensure modal is rendered
            // or if the ref is already available
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            }, 100)

            setIsCameraActive(true)
            setUploadError(null)
            setSelectedFile(null)
            setPreviewUrl(null)
        } catch (err) {
            console.error("Error accessing camera:", err)
            toast.error("Could not access camera. Please check permissions.")
            setIsCameraActive(false)
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
    }

    const closeCameraModal = () => {
        stopCamera()
        setIsCameraActive(false)
    }

    const switchCamera = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newMode)
        startCamera(newMode)
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            // Draw video frame to canvas
            const context = canvas.getContext('2d')
            if (context) {
                // Apply mirroring if using front camera
                if (facingMode === 'user') {
                    context.translate(canvas.width, 0)
                    context.scale(-1, 1)
                }

                context.drawImage(video, 0, 0, canvas.width, canvas.height)

                // Reset transform (optional, but good practice if reusing context)
                context.setTransform(1, 0, 0, 1, 0, 0)

                // Convert to file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "face-capture.jpg", { type: "image/jpeg" })
                        setSelectedFile(file)
                        setPreviewUrl(URL.createObjectURL(blob))
                        closeCameraModal()
                    }
                }, 'image/jpeg', 0.95)
            }
        }
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setUploadError("File size too large. Please select an image under 5MB.")
                return
            }

            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
            setUploadError(null)
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setIsUploading(true)
        setUploadError(null)

        const formData = new FormData()
        formData.append('photo', selectedFile)

        try {
            await studentsAPI.uploadFace(studentId, formData)

            toast.success('Face registered successfully')

            setSelectedFile(null)
            setPreviewUrl(null)
            if (onSuccess) onSuccess()

        } catch (error: any) {
            console.error('Upload failed:', error)
            const message = error.response?.data?.error || 'Failed to upload face encoding'
            setUploadError(message)
            toast.error(message)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <span>Face Registration</span>
            </h2>

            <p className="text-sm text-gray-600 mb-4">
                Capture or upload a clear front-facing photo to enable face recognition.
            </p>

            {uploadError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center text-sm">
                    <FiAlertCircle className="mr-2 flex-shrink-0" />
                    {uploadError}
                </div>
            )}

            <div className="space-y-4">
                {/* Camera Modal Overlay */}
                {isCameraActive && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-90">
                        <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                            {/* Header */}
                            <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                                <span className="text-white font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                                    {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
                                </span>
                                <button
                                    onClick={closeCameraModal}
                                    className="p-2 bg-black/30 text-white rounded-full hover:bg-white/20 backdrop-blur-sm transition-all"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>

                            {/* Video View */}
                            <div className="aspect-video bg-black relative flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
                                />
                            </div>

                            {/* Controls Bar */}
                            <div className="p-6 bg-gray-900 flex items-center justify-between">
                                <button
                                    onClick={switchCamera}
                                    className="p-3 text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                                    title="Switch Camera"
                                >
                                    <FiRefreshCw size={20} />
                                </button>

                                <button
                                    onClick={capturePhoto}
                                    className="flex items-center px-8 py-3 bg-white text-gray-900 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-transform active:scale-95"
                                >
                                    <div className="w-4 h-4 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                                    Capture
                                </button>

                                <div className="w-12"></div> {/* Spacer for alignment */}
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview View */}
                {!isCameraActive && previewUrl && (
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video mb-4 flex items-center justify-center border-2 border-dashed border-green-300 bg-green-50">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute top-2 right-2 flex space-x-2">
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="p-1 bg-white rounded-full shadow hover:bg-gray-100 text-red-500"
                                title="Remove"
                            >
                                <FiAlertCircle />
                            </button>
                        </div>
                        <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-green-700 font-medium bg-white/80 py-1">
                            Ready to register
                        </p>
                    </div>
                )}

                {/* Initial / Action Buttons */}
                {!isCameraActive && !previewUrl && (
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => startCamera(facingMode)}
                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors group"
                        >
                            <div className="p-3 bg-primary-100 text-primary-600 rounded-full mb-3 group-hover:bg-primary-200">
                                <FiCamera className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">Use Camera</span>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="p-3 bg-gray-100 text-gray-600 rounded-full mb-3 group-hover:bg-gray-200">
                                <FiUpload className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Upload File</span>
                        </button>
                    </div>
                )}

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                />

                {/* Hidden Canvas for Capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Register Button - Only show if file selected */}
                {selectedFile && (
                    <div className="flex space-x-3">
                        <button
                            onClick={() => {
                                setSelectedFile(null)
                                setPreviewUrl(null)
                                startCamera(facingMode) // Retake
                            }}
                            disabled={isUploading}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Retake
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <FiCheck className="mr-2" />
                                    Confirm & Register
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default FaceRegistration
