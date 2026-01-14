import { FiGrid, FiList } from 'react-icons/fi'
import Select from '../ui/Select'

interface BusFiltersProps {
    statusFilter: string
    setStatusFilter: (val: string) => void
    viewMode: 'grid' | 'list'
    setViewMode: (val: 'grid' | 'list') => void
    schools?: any[]
    selectedSchool?: string
    setSelectedSchool?: (val: string) => void
}

export default function BusFilters({
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    schools,
    selectedSchool,
    setSelectedSchool
}: BusFiltersProps) {

    const STATUS_OPTIONS = [
        { id: 'all', name: 'All Status' },
        { id: 'active', name: 'Active' },
        { id: 'inactive', name: 'Inactive' }
    ]

    const schoolOptions = [
        { id: '', name: 'All Schools' },
        ...(schools?.map(s => ({ id: s.id, name: s.name })) || [])
    ]

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {/* Status Filter */}
            <div className="w-full sm:w-40">
                <Select
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={STATUS_OPTIONS}
                    placeholder="Status"
                />
            </div>

            {/* School Filter (Optional) */}
            {schools && schools.length > 0 && setSelectedSchool && (
                <div className="w-full sm:w-48">
                    <Select
                        value={selectedSchool || ''}
                        onChange={(val) => setSelectedSchool(val)}
                        options={schoolOptions}
                        placeholder="Select School"
                    />
                </div>
            )}

            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1" />

            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-center">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 sm:p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Grid View"
                >
                    <FiGrid className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 sm:p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    title="List View"
                >
                    <FiList className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
