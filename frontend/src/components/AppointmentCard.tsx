import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { apiService } from '../services/apiService'
import toast from 'react-hot-toast'

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

interface AppointmentCardProps {
  appointment: Appointment
  onUpdate: () => void
  onDelete: () => void
}

export function AppointmentCard({ appointment, onUpdate, onDelete }: AppointmentCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    try {
      await apiService.updateAppointment(
        appointment.appointmentId,
        { status: newStatus }
      )
      toast.success('Appointment status updated')
      onUpdate()
    } catch (error) {
      toast.error('Failed to update appointment status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return
    }

    setIsLoading(true)
    try {
      await apiService.deleteAppointment(appointment.appointmentId)
      toast.success('Appointment deleted')
      onDelete()
    } catch (error) {
      toast.error('Failed to delete appointment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="card-body">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{appointment.title}</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
            {getStatusIcon(appointment.status)}
            <span className="ml-1 capitalize">{appointment.status}</span>
          </span>
        </div>

        {appointment.description && (
          <p className="text-gray-600 text-sm mb-4">{appointment.description}</p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {format(parseISO(appointment.startTime), 'MMM dd, yyyy')}
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <ClockIcon className="h-4 w-4 mr-2" />
            {format(parseISO(appointment.startTime), 'h:mm a')} - {format(parseISO(appointment.endTime), 'h:mm a')}
          </div>

          {appointment.location && (
            <div className="flex items-center text-sm text-gray-500">
              <MapPinIcon className="h-4 w-4 mr-2" />
              {appointment.location}
            </div>
          )}

          {appointment.attendees && appointment.attendees.length > 0 && (
            <div className="flex items-center text-sm text-gray-500">
              <UserGroupIcon className="h-4 w-4 mr-2" />
              {appointment.attendees.length} attendee{appointment.attendees.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {appointment.status === 'scheduled' && (
              <button
                onClick={() => handleStatusChange('confirmed')}
                disabled={isLoading}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            )}
            
            {appointment.status !== 'cancelled' && (
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={isLoading}
                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => {/* TODO: Implement edit functionality */}}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
