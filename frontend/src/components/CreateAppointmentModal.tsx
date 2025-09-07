import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { XMarkIcon } from '@heroicons/react/24/outline'
import DatePicker from 'react-datepicker'
import { apiService } from '../services/apiService'
import toast from 'react-hot-toast'
import 'react-datepicker/dist/react-datepicker.css'

interface CreateAppointmentForm {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: string
  reminderMinutes: number
}

interface CreateAppointmentModalProps {
  tenantId: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateAppointmentModal({ tenantId, onClose, onSuccess }: CreateAppointmentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(new Date(Date.now() + 60 * 60 * 1000)) // 1 hour later

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CreateAppointmentForm>({
    defaultValues: {
      reminderMinutes: 60
    }
  })

  const onSubmit = async (data: CreateAppointmentForm) => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end times')
      return
    }

    if (startDate >= endDate) {
      toast.error('End time must be after start time')
      return
    }

    setIsLoading(true)
    try {
      const appointmentData = {
        ...data,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        attendees: data.attendees ? data.attendees.split(',').map(email => email.trim()) : []
      }

      await apiService.createAppointment(tenantId, appointmentData)
      toast.success('Appointment created successfully!')
      onSuccess()
    } catch (error) {
      toast.error('Failed to create appointment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Appointment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              type="text"
              className="input"
              placeholder="Enter appointment title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Enter appointment description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time *</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="input w-full"
                minDate={new Date()}
              />
            </div>

            <div>
              <label className="label">End Time *</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="input w-full"
                minDate={startDate || new Date()}
              />
            </div>
          </div>

          <div>
            <label className="label">Location</label>
            <input
              {...register('location')}
              type="text"
              className="input"
              placeholder="Enter location (optional)"
            />
          </div>

          <div>
            <label className="label">Attendees</label>
            <input
              {...register('attendees')}
              type="text"
              className="input"
              placeholder="Enter email addresses separated by commas"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate multiple email addresses with commas
            </p>
          </div>

          <div>
            <label className="label">Reminder (minutes before)</label>
            <select
              {...register('reminderMinutes', { valueAsNumber: true })}
              className="input"
            >
              <option value={0}>No reminder</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={1440}>1 day</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
