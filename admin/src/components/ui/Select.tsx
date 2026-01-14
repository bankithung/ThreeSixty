import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { FiChevronDown, FiCheck } from 'react-icons/fi'

interface Option {
    id: string | number
    name: string
    description?: string
    icon?: any
}

interface SelectProps {
    label?: string
    value: string | number
    onChange: (value: any) => void
    options: Option[]
    placeholder?: string
    className?: string
    disabled?: boolean
}

export default function Select({
    label,
    value,
    onChange,
    options,
    placeholder = 'Select option',
    className = '',
    disabled = false
}: SelectProps) {
    const selectedOption = options.find(opt => opt.id === value) || null

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className={`relative ${className}`}>
                {label && (
                    <Listbox.Label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                    </Listbox.Label>
                )}
                <div className="relative">
                    <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2.5 pl-3 pr-10 text-left shadow-sm border focus:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-300 sm:text-sm transition-all ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 text-gray-900 hover:border-gray-300'
                        }`}>
                        <span className={`block truncate ${!selectedOption ? 'text-gray-500' : ''}`}>
                            {selectedOption ? selectedOption.name : placeholder}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <FiChevronDown
                                className="h-4 w-4 text-gray-400"
                                aria-hidden="true"
                            />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm min-w-[150px] scrollbar-thin">
                            {options.map((option) => (
                                <Listbox.Option
                                    key={option.id}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                                        }`
                                    }
                                    value={option.id}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                {option.name}
                                            </span>
                                            {option.description && (
                                                <span className="block truncate text-xs text-gray-400 mt-0.5">
                                                    {option.description}
                                                </span>
                                            )}
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                                                    <FiCheck className="h-4 w-4" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </div>
        </Listbox>
    )
}
