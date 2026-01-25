import { useState, useRef, useEffect } from 'react'
import { FiEdit2, FiCheck, FiX } from 'react-icons/fi'

interface EditableFieldProps {
    label: string
    value: string | number | null | undefined
    fieldKey: string
    onSave: (key: string, value: string) => Promise<void>
    editable?: boolean
    type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea'
    placeholder?: string
    className?: string
}

export default function EditableField({
    label,
    value,
    fieldKey,
    onSave,
    editable = true,
    type = 'text',
    placeholder = '-',
    className = ''
}: EditableFieldProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(String(value || ''))
    const [isSaving, setIsSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    useEffect(() => {
        setEditValue(String(value || ''))
    }, [value])

    const handleSave = async () => {
        if (editValue === String(value || '')) {
            setIsEditing(false)
            return
        }
        setIsSaving(true)
        try {
            await onSave(fieldKey, editValue)
            setIsEditing(false)
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setEditValue(String(value || ''))
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && type !== 'textarea') {
            e.preventDefault()
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    const displayValue = value || placeholder

    return (
        <div className={`group ${className}`}>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</dt>
            {isEditing ? (
                <div className="flex items-center gap-1">
                    {type === 'textarea' ? (
                        <textarea
                            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            rows={2}
                            disabled={isSaving}
                        />
                    ) : (
                        <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type={type}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={isSaving}
                        />
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Save"
                    >
                        <FiCheck className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                        title="Cancel"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <dd className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                        {displayValue}
                    </span>
                    {editable && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                            title="Edit"
                        >
                            <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </dd>
            )}
        </div>
    )
}
