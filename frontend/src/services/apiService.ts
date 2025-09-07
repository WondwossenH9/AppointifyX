import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com/dev'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Get token from auth context
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export interface Appointment {
  appointmentId: string
  tenantId: string
  userId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  attendees?: string[]
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  reminderMinutes: number
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentData {
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  attendees?: string[]
  reminderMinutes?: number
}

export interface UpdateAppointmentData {
  title?: string
  description?: string
  startTime?: string
  endTime?: string
  location?: string
  attendees?: string[]
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  reminderMinutes?: number
}

export interface AppointmentFilters {
  startDate?: string
  endDate?: string
  status?: string
  userId?: string
}

class ApiService {
  // Appointments
  async getAppointments(tenantId: string, filters?: AppointmentFilters): Promise<Appointment[]> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.userId) params.append('userId', filters.userId)

    const response = await apiClient.get(`/tenants/${tenantId}/appointments?${params.toString()}`)
    return response.data.data.appointments
  }

  async getAppointment(tenantId: string, appointmentId: string): Promise<Appointment> {
    const response = await apiClient.get(`/tenants/${tenantId}/appointments/${appointmentId}`)
    return response.data.data
  }

  async createAppointment(tenantId: string, appointmentData: CreateAppointmentData): Promise<Appointment> {
    const response = await apiClient.post(`/tenants/${tenantId}/appointments`, appointmentData)
    return response.data.data
  }

  async updateAppointment(appointmentId: string, updateData: UpdateAppointmentData): Promise<Appointment> {
    // Extract tenantId from the appointmentId or pass it as parameter
    // For now, we'll assume tenantId is available in the context
    const tenantId = 'tenant-001' // TODO: Get from context
    const response = await apiClient.put(`/tenants/${tenantId}/appointments/${appointmentId}`, updateData)
    return response.data.data
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    const tenantId = 'tenant-001' // TODO: Get from context
    await apiClient.delete(`/tenants/${tenantId}/appointments/${appointmentId}`)
  }

  // Authentication
  async login(email: string, password: string, tenantId: string): Promise<{ token: string; user: any }> {
    // TODO: Implement actual authentication with Cognito
    // For now, return mock data
    return {
      token: 'mock-jwt-token',
      user: {
        email,
        tenantId,
        role: 'tenant-user'
      }
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('authToken')
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await apiClient.get('/health')
    return response.data
  }
}

export const apiService = new ApiService()
