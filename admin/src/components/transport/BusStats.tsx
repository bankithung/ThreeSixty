import { FiTruck, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi'
import StatCard from '../../components/StatCard'

export default function BusStats({ buses }: { buses: any[] }) {
    const totalBuses = buses.length
    const activeBuses = buses.filter((b: any) => b.is_active).length
    const maintenanceBuses = buses.filter((b: any) => b.status === 'maintenance').length // Assuming logic, or refine based on real data
    const onRouteBuses = buses.filter((b: any) => b.current_status === 'on_route').length

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Vehicles" value={totalBuses} icon={FiTruck} color="blue" />
            <StatCard label="Active / On Route" value={activeBuses} icon={FiCheckCircle} color="green" />
            <StatCard label="On Route" value={onRouteBuses} icon={FiClock} color="orange" />
            <StatCard label="Maintenance" value={maintenanceBuses} icon={FiAlertCircle} color="red" />
        </div>
    )
}
