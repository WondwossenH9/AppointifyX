import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useQuery } from 'react-query'
import { 
  CalendarIcon, 
  PlusIcon, 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { AppointmentCard } from '../../components/AppointmentCard'
import { CreateAppointmentModal } from '../../components/CreateAppointmentModal'
import { apiService } from '../../services/apiService'

interface Appointment {
  appointmentId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  attendees?: string[]
}

export default function Dashboard() {
  const router = useRouter()
  const { tenantId } = router.query
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: appointments, isLoading, refetch } = useQuery(
    ['appointments', tenantId],
    () => apiService.getAppointments(tenantId as string),
    {
      enabled: !!tenantId,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  )

  const handleAppointmentCreated = () => {
    setShowCreateModal(false)
    refetch()
  }

  const handleAppointmentUpdated = () => {
    refetch()
  }

  const handleAppointmentDeleted = () => {
    refetch()
  }

  if (!tenantId) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Head>
        <title>Dashboard - AppointifyX</title>
        <meta name="description" content="AppointifyX Dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AppointifyX</h1>
                  <p className="text-sm text-gray-500">Tenant: {tenantId}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Appointment
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {appointments?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Scheduled</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {appointments?.filter(a => a.status === 'scheduled').length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Confirmed</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {appointments?.filter(a => a.status === 'confirmed').length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircleIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Cancelled</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {appointments?.filter(a => a.status === 'cancelled').length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Recent Appointments</h2>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading appointments...</p>
                </div>
              ) : appointments && appointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appointments.map((appointment: Appointment) => (
                    <AppointmentCard
                      key={appointment.appointmentId}
                      appointment={appointment}
                      onUpdate={handleAppointmentUpdated}
                      onDelete={handleAppointmentDeleted}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first appointment.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Appointment
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Create Appointment Modal */}
        {showCreateModal && (
          <CreateAppointmentModal
            tenantId={tenantId as string}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleAppointmentCreated}
          />
        )}
      </div>
    </>
  )
}
