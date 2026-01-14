import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionsAPI, schoolsAPI, subscriptionsAPI } from '../lib/api'
import { FiDollarSign, FiDownload, FiTrendingUp, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import SearchableSelect from '../components/SearchableSelect'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function GlobalFinance() {
    const [statusFilter, setStatusFilter] = useState('All Status')
    const [schoolFilter, setSchoolFilter] = useState('')
    const [featureFilter, setFeatureFilter] = useState('')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [showExportMenu, setShowExportMenu] = useState(false)

    // Fetch Schools for Filter
    const { data: schoolsData } = useQuery({
        queryKey: ['schools_list'],
        queryFn: () => schoolsAPI.list(),
    })
    const schoolsList = schoolsData?.data?.results || schoolsData?.data || []
    const rawSchoolOptions = schoolsList.map((s: any) => ({ name: s.name, id: s.id }))
    const schoolNames = ['All Schools', ...Array.from(new Set(rawSchoolOptions.map((s: any) => s.name)))]

    // Fetch Features for Filter
    const { data: featuresData } = useQuery({
        queryKey: ['features_list'],
        queryFn: () => subscriptionsAPI.listFeatures(),
    })
    const featuresList = featuresData?.data?.results || featuresData?.data || []
    const featureNames = ['All Features', ...Array.from(new Set(featuresList.map((f: any) => f.name)))]

    // Resolve School Name to ID
    const selectedSchoolId = rawSchoolOptions.find((s: any) => s.name === schoolFilter)?.id || ''

    // Fetch Stats
    const { data: statsData, isLoading: isLoadingStats } = useQuery({
        queryKey: ['transactionStats', selectedSchoolId, dateRange],
        queryFn: () => transactionsAPI.stats(),
    })
    const stats = statsData?.data || { total_earnings: 0, mrr: 0, pending_payouts: 0 }

    // Fetch Transactions
    const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
        queryKey: ['transactions', statusFilter, selectedSchoolId, featureFilter, dateRange, searchQuery, page],
        queryFn: () => transactionsAPI.list({
            status: statusFilter === 'All Status' ? 'all' : statusFilter.toLowerCase(),
            school: selectedSchoolId,
            feature: featureFilter === 'All Features' ? '' : featureFilter,
            start_date: dateRange.start,
            end_date: dateRange.end,
            search: searchQuery,
            page: page,
        }),
    })
    const transactions = transactionsData?.data?.results || transactionsData?.data || []
    const nextUrl = transactionsData?.data?.next
    const previousUrl = transactionsData?.data?.previous

    // Export Functionality
    const exportData = (type: 'csv' | 'json' | 'pdf') => {
        if (!transactions.length) {
            toast.error('No transactions to export')
            return
        }

        if (type === 'pdf') {
            const doc = new jsPDF()
            doc.text('Transactions Report', 14, 15)
            doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 22)

            const tableColumn = ["Date", "School", "Feature", "Amount", "Status"]
            const tableRows = transactions.map((t: any) => [
                format(new Date(t.transaction_date), 'yyyy-MM-dd'),
                t.school_name,
                t.feature_name || '-',
                formatCurrency(t.amount),
                t.status
            ])

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 30,
            })

            doc.save(`transactions_report_${format(new Date(), 'yyyyMMdd')}.pdf`)
            toast.success('Exported as PDF')
            setShowExportMenu(false)
            return
        }

        let blob: Blob
        let filename: string

        if (type === 'csv') {
            const headers = ['Date', 'School', 'City', 'Feature', 'Amount', 'Status', 'Payment Method', 'Reference ID', 'Description']
            const csvContent = [
                headers.join(','),
                ...transactions.map((t: any) => [
                    format(new Date(t.transaction_date), 'yyyy-MM-dd HH:mm'),
                    `"${t.school_name}"`,
                    `"${t.school_city || ''}"`,
                    `"${t.feature_name || ''}"`,
                    t.amount,
                    t.status,
                    t.payment_method || '-',
                    t.reference_id || '-',
                    `"${t.description || ''}"`
                ].join(','))
            ].join('\n')
            blob = new Blob([csvContent], { type: 'text/csv' })
            filename = `transactions_report_${format(new Date(), 'yyyyMMdd')}.csv`
        } else {
            const jsonContent = JSON.stringify(transactions, null, 2)
            blob = new Blob([jsonContent], { type: 'application/json' })
            filename = `transactions_report_${format(new Date(), 'yyyyMMdd')}.json`
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success(`Exported as ${type.toUpperCase()}`)
        setShowExportMenu(false)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-700 border-green-200'
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'failed': return 'bg-red-100 text-red-700 border-red-200'
            case 'refunded': return 'bg-gray-100 text-gray-700 border-gray-200'
            default: return 'bg-gray-50 text-gray-600 border-gray-100'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return FiCheckCircle
            case 'pending': return FiClock
            case 'failed': return FiXCircle
            case 'refunded': return FiAlertCircle
            default: return FiAlertCircle
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    const statusOptions = ['All Status', 'Paid', 'Pending', 'Failed']

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Stats - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Earnings</h3>
                        {isLoadingStats ? (
                            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mt-1"></div>
                        ) : (
                            <p className="text-2xl font-bold text-gray-800 mt-0.5">{formatCurrency(stats.total_earnings)}</p>
                        )}
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <FiDollarSign className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">MRR</h3>
                        {isLoadingStats ? (
                            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mt-1"></div>
                        ) : (
                            <p className="text-2xl font-bold text-gray-800 mt-0.5">{formatCurrency(stats.mrr)}</p>
                        )}
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <FiTrendingUp className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">Pending</h3>
                        {isLoadingStats ? (
                            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mt-1"></div>
                        ) : (
                            <p className="text-2xl font-bold text-gray-800 mt-0.5">{formatCurrency(stats.pending_payouts)}</p>
                        )}
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <FiClock className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filters & Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-100 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="font-bold text-gray-800 text-lg">Transactions</h3>

                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-all shadow-sm text-sm font-medium h-10 min-w-[100px]"
                            >
                                <FiDownload className="mr-2 text-gray-500" />
                                Export
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20 border border-gray-100 transform origin-top-right animate-fade-in-up">
                                    <div className="py-1">
                                        <button
                                            onClick={() => exportData('csv')}
                                            className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                        >
                                            Export as CSV
                                        </button>
                                        <button
                                            onClick={() => exportData('json')}
                                            className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                        >
                                            Export as JSON
                                        </button>
                                        <button
                                            onClick={() => exportData('pdf')}
                                            className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                        >
                                            Export as PDF
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                        {/* Search - Spans 2 columns */}
                        <div className="lg:col-span-2 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiSearch className="text-gray-400 text-lg" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm h-10 transition-colors"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            />
                        </div>

                        {/* Date Start - Spans 2 columns */}
                        <div className="lg:col-span-2">
                            <input
                                type="date"
                                className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-500 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm h-10"
                                value={dateRange.start}
                                onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setPage(1); }}
                            />
                        </div>

                        {/* Date End - Spans 2 columns */}
                        <div className="lg:col-span-2">
                            <input
                                type="date"
                                className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-500 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm h-10"
                                value={dateRange.end}
                                onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setPage(1); }}
                            />
                        </div>

                        {/* School Filter - Spans 2 columns */}
                        <div className="lg:col-span-2">
                            <SearchableSelect
                                value={schoolFilter}
                                onChange={(val: string) => { setSchoolFilter(val); setPage(1); }}
                                options={schoolNames as string[]}
                                placeholder="All Schools"
                                className="h-10"
                            />
                        </div>

                        {/* Feature Filter - Spans 2 columns */}
                        <div className="lg:col-span-2">
                            <SearchableSelect
                                value={featureFilter}
                                onChange={(val: string) => { setFeatureFilter(val); setPage(1); }}
                                options={featureNames as string[]}
                                placeholder="Feature"
                                className="h-10"
                            />
                        </div>

                        {/* Status Filter - Spans 2 columns */}
                        <div className="lg:col-span-2">
                            <SearchableSelect
                                value={statusFilter}
                                onChange={(val: string) => { setStatusFilter(val); setPage(1); }}
                                options={statusOptions}
                                placeholder="Status"
                                className="h-10"
                            />
                        </div>
                    </div>
                </div>

                {isLoadingTransactions ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">School</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Method</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.map((transaction: any) => {
                                    const StatusIcon = getStatusIcon(transaction.status)
                                    return (
                                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {format(new Date(transaction.transaction_date), 'dd MMM, yyyy')}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {format(new Date(transaction.transaction_date), 'hh:mm a')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {transaction.school_logo ? (
                                                        <img
                                                            src={transaction.school_logo}
                                                            alt={transaction.school_name}
                                                            className="w-8 h-8 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                            {transaction.school_name?.[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{transaction.school_name}</div>
                                                        <div className="text-xs text-gray-500">{transaction.school_city}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-700 max-w-xs truncate" title={transaction.description}>
                                                    {transaction.description || '-'}
                                                </div>
                                                {transaction.reference_id && (
                                                    <div className="text-xs text-gray-400 font-mono mt-0.5">Ref: {transaction.reference_id}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-gray-900">
                                                    {formatCurrency(transaction.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    <span className="capitalize">{transaction.status}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {transaction.payment_method?.replace('_', ' ') || '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-20 text-center text-gray-500 bg-white">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <FiDollarSign className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No Transactions Found</h3>
                        <p className="mt-1">Try adjusting your filters or search criteria.</p>
                    </div>
                )}

                {/* Pagination Controls */}
                {transactions.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Page <span className="font-medium">{page}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={!previousUrl}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors flex items-center gap-1
                                    ${!previousUrl
                                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-primary-600'}`}
                            >
                                <FiChevronLeft /> Previous
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={!nextUrl}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors flex items-center gap-1
                                    ${!nextUrl
                                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-primary-600'}`}
                            >
                                Next <FiChevronRight />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
