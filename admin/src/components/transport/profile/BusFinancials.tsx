import { FiArrowUpRight, FiArrowDownRight, FiDollarSign } from 'react-icons/fi'

interface BusFinancialsProps {
    totalEarnings: number
    totalExpenses: number
    recentTransactions?: any[]
}

export default function BusFinancials({ totalEarnings, totalExpenses, recentTransactions = [] }: BusFinancialsProps) {
    const netProfit = totalEarnings - totalExpenses
    const isProfitable = netProfit >= 0

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Earnings</p>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <FiArrowUpRight />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">₹{totalEarnings.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <FiArrowDownRight />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">₹{totalExpenses.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 mb-1">Net Profit</p>
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isProfitable ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            <FiDollarSign />
                        </div>
                        <h3 className={`text-2xl font-bold ${isProfitable ? 'text-gray-900' : 'text-orange-600'}`}>
                            ₹{Math.abs(netProfit).toLocaleString()}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Simple Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                </div>
                {/* Placeholder content for now since we passed empty array default */}
                <div className="p-12 text-center text-gray-500">
                    No recent transactions to display.
                </div>
            </div>
        </div>
    )
}
