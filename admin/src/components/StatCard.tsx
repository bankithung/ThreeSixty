import { IconType } from 'react-icons'

interface StatCardProps {
    label: string
    value: string | number
    subtext?: string
    icon: IconType
    color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal'
}

export default function StatCard({ label, value, subtext, icon: Icon, color }: StatCardProps) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        red: 'bg-red-50 text-red-600',
        purple: 'bg-purple-50 text-purple-600',
        teal: 'bg-teal-50 text-teal-600'
    }

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between min-w-[200px]">
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{value}</span>
                    {subtext && <span className="text-xs font-medium text-gray-500">{subtext}</span>}
                </div>
            </div>
            <div className={`p-3 rounded-lg ${colors[color] || 'bg-gray-100 text-gray-600'}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    )
}
