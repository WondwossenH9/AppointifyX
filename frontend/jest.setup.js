import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: { tenantId: 'test-tenant' },
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock React Query
jest.mock('react-query', () => ({
  useQuery: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }) => children,
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'https://test-api.example.com'
process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID = 'test-pool-id'
process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID = 'test-client-id'
process.env.NEXT_PUBLIC_COGNITO_REGION = 'us-east-1'

// Global test utilities
global.mockAppointment = {
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

global.mockTenant = {
  tenantId: 'test-tenant',
  name: 'Test Company',
  domain: 'test.com',
  plan: 'premium',
  status: 'active'
}
