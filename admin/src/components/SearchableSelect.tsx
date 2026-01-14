import { useState, useRef, useEffect } from 'react'
import { FiChevronDown, FiSearch, FiCheck } from 'react-icons/fi'

interface SearchableSelectProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder?: string
    className?: string
}

export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className = '',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    const filteredOptions = options.filter((option) =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow text-left"
            >
                <span className={`block truncate ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
                    {value || placeholder}
                </span>
                <FiChevronDown
                    className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''
                        }`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-hidden flex flex-col animate-fade-in-up">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-900"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-gray-500 text-center">
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        onChange(option)
                                        setIsOpen(false)
                                        setSearchTerm('')
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${value === option ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                                        }`}
                                >
                                    <span>{option}</span>
                                    {value === option && <FiCheck className="text-primary-500" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
