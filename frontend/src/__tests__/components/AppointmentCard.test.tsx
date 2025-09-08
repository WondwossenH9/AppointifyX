import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppointmentCard } from '../../components/AppointmentCard'
import { apiService } from '../../services/apiService'

// Mock the API service
jest.mock('../../services/apiService', () => ({
  apiService: {
    updateAppointment: jest.fn(),
    deleteAppointment: jest.fn(),
  },
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, format) => {
    if (format === 'MMM dd, yyyy') return 'Jan 15, 2024'
    if (format === 'h:mm a') return '10:00 AM'
    return '2024-01-15'
  }),
  parseISO: jest.fn((date) => new Date(date)),
}))

describe('AppointmentCard', () => {
  const mockAppointment = {
    appointmentId: 'test-appointment-123',
    tenantId: 'test-tenant',
    userId: 'test-user',
    title: 'Test Appointment',
    description: 'Test Description',
    startTime: '2024-01-15T10:00:00Z',
    endTime: '2024-01-15T11:00:00Z',
    location: 'Test Location',
    attendees: ['test@example.com'],
    status: 'scheduled',
    reminderMinutes: 60,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const mockOnUpdate = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders appointment information correctly', () => {
    render(
      <AppointmentCard
        appointment={mockAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Test Appointment')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('10:00 AM - 11:00 AM')).toBeInTheDocument()
    expect(screen.getByText('Test Location')).toBeInTheDocument()
    expect(screen.getByText('1 attendee')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('shows correct status badge for scheduled appointment', () => {
    render(
      <AppointmentCard
        appointment={mockAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const statusBadge = screen.getByText('Scheduled')
    expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('shows correct status badge for confirmed appointment', () => {
    const confirmedAppointment = { ...mockAppointment, status: 'confirmed' }
    
    render(
      <AppointmentCard
        appointment={confirmedAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const statusBadge = screen.getByText('Confirmed')
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows correct status badge for cancelled appointment', () => {
    const cancelledAppointment = { ...mockAppointment, status: 'cancelled' }
    
    render(
      <AppointmentCard
        appointment={cancelledAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const statusBadge = screen.getByText('Cancelled')
    expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('handles appointment without description', () => {
    const appointmentWithoutDescription = { ...mockAppointment }
    delete appointmentWithoutDescription.description

    render(
      <AppointmentCard
        appointment={appointmentWithoutDescription}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Test Appointment')).toBeInTheDocument()
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument()
  })

  it('handles appointment without location', () => {
    const appointmentWithoutLocation = { ...mockAppointment }
    delete appointmentWithoutLocation.location

    render(
      <AppointmentCard
        appointment={appointmentWithoutLocation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Test Appointment')).toBeInTheDocument()
    expect(screen.queryByText('Test Location')).not.toBeInTheDocument()
  })

  it('handles appointment without attendees', () => {
    const appointmentWithoutAttendees = { ...mockAppointment, attendees: [] }

    render(
      <AppointmentCard
        appointment={appointmentWithoutAttendees}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Test Appointment')).toBeInTheDocument()
    expect(screen.queryByText('attendee')).not.toBeInTheDocument()
  })

  it('shows multiple attendees correctly', () => {
    const appointmentWithMultipleAttendees = {
      ...mockAppointment,
      attendees: ['test1@example.com', 'test2@example.com', 'test3@example.com']
    }

    render(
      <AppointmentCard
        appointment={appointmentWithMultipleAttendees}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('3 attendees')).toBeInTheDocument()
  })

  it('calls onUpdate when status is changed to confirmed', async () => {
    const mockUpdateAppointment = apiService.updateAppointment as jest.MockedFunction<typeof apiService.updateAppointment>
    mockUpdateAppointment.mockResolvedValue(undefined)

    render(
      <AppointmentCard
        appointment={mockAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockUpdateAppointment).toHaveBeenCalledWith('test-appointment-123', { status: 'confirmed' })
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })

  it('calls onUpdate when status is changed to cancelled', async () => {
    const mockUpdateAppointment = apiService.updateAppointment as jest.MockedFunction<typeof apiService.updateAppointment>
    mockUpdateAppointment.mockResolvedValue(undefined)

    render(
      <AppointmentCard
        appointment={mockAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockUpdateAppointment).toHaveBeenCalledWith('test-appointment-123', { status: 'cancelled' })
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })

  it('calls onDelete when delete button is clicked', async () => {
    const mockDeleteAppointment = apiService.deleteAppointment as jest.MockedFunction<typeof apiService.deleteAppointment>
    mockDeleteAppointment.mockResolvedValue(undefined)

    // Mock window.confirm
    window.confirm = jest.fn(() => true)

    render(
      <AppointmentCard
        appointment={mockAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this appointment?')
      expect(mockDeleteAppointment).toHaveBeenCalledWith('test-appointment-123')
      expect(mockOnDelete).toHaveBeenCalled()
    })
  })

  it('does not call onDelete when user cancels confirmation', async () => {
    const mockDeleteAppointment = apiService.deleteAppointment as jest.MockedFunction<typeof apiService.deleteAppointment>
    
    // Mock window.confirm to return false
    window.confirm = jest.fn(() => false)

    render(
      <AppointmentCard
        appointment={mockAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this appointment?')
      expect(mockDeleteAppointment).not.toHaveBeenCalled()
      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  it('does not show confirm button for cancelled appointments', () => {
    const cancelledAppointment = { ...mockAppointment, status: 'cancelled' }

    render(
      <AppointmentCard
        appointment={cancelledAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })

  it('does not show cancel button for cancelled appointments', () => {
    const cancelledAppointment = { ...mockAppointment, status: 'cancelled' }

    render(
      <AppointmentCard
        appointment={cancelledAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    const mockUpdateAppointment = apiService.updateAppointment as jest.MockedFunction<typeof apiService.updateAppointment>
    mockUpdateAppointment.mockRejectedValue(new Error('API Error'))

    // Mock toast.error
    const mockToast = require('react-hot-toast').toast
    mockToast.error = jest.fn()

    render(
      <AppointmentCard
        appointment={mockAppointment}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to update appointment status')
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })
  })
})
