import { handler } from '../../src/handlers/appointments';
import { AppointmentService } from '../../src/services/AppointmentService';
import { AuthService } from '../../src/services/AuthService';
import '../../tests/types';

// Mock services
jest.mock('../../src/services/AppointmentService');
jest.mock('../../src/services/AuthService');

const MockedAppointmentService = AppointmentService as jest.MockedClass<typeof AppointmentService>;
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('Appointments Handler Integration Tests', () => {
  let mockAppointmentService: jest.Mocked<AppointmentService>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockAppointmentService = new MockedAppointmentService() as jest.Mocked<AppointmentService>;
    mockAuthService = new MockedAuthService() as jest.Mocked<AuthService>;
    
    jest.clearAllMocks();
  });

  describe('GET /tenants/{tenantId}/appointments', () => {
    it('should return appointments list successfully', async () => {
      const mockAppointments = [
        {
          appointmentId: 'app-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          title: 'Test Appointment 1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          status: 'scheduled' as const,
          reminderMinutes: 60,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.listAppointments.mockResolvedValue(mockAppointments);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: {
          appointments: mockAppointments,
          count: 1
        }
      });

      expect(mockAuthService.validateRequest).toHaveBeenCalledWith(event, 'tenant-1');
      expect(mockAppointmentService.listAppointments).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'tenant-user',
        {}
      );
    });

    it('should return 401 when authentication fails', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: false,
        error: 'Invalid token'
      });

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Unauthorized',
          details: 'Invalid token'
        }
      });
    });

    it('should handle query parameters correctly', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.listAppointments.mockResolvedValue([]);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' },
        queryStringParameters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          status: 'scheduled'
        }
      });

      await handler(event, createMockContext());

      expect(mockAppointmentService.listAppointments).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'tenant-user',
        {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          status: 'scheduled'
        }
      );
    });
  });

  describe('GET /tenants/{tenantId}/appointments/{appointmentId}', () => {
    it('should return single appointment successfully', async () => {
      const mockAppointment = {
        appointmentId: 'app-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        title: 'Test Appointment',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        status: 'scheduled' as const,
        reminderMinutes: 60,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.getAppointment.mockResolvedValue(mockAppointment);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/tenants/tenant-1/appointments/app-1',
        pathParameters: { tenantId: 'tenant-1', appointmentId: 'app-1' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAppointment
      });
    });

    it('should return 404 when appointment not found', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.getAppointment.mockResolvedValue(null);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/tenants/tenant-1/appointments/nonexistent',
        pathParameters: { tenantId: 'tenant-1', appointmentId: 'nonexistent' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Appointment not found'
        }
      });
    });
  });

  describe('POST /tenants/{tenantId}/appointments', () => {
    it('should create appointment successfully', async () => {
      const appointmentData = {
        title: 'New Appointment',
        description: 'New Description',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        location: 'New Location',
        attendees: ['new@example.com'],
        reminderMinutes: 30
      };

      const createdAppointment = {
        appointmentId: 'new-app-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        ...appointmentData,
        status: 'scheduled' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.createAppointment.mockResolvedValue(createdAppointment);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' },
        body: JSON.stringify(appointmentData)
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: createdAppointment
      });

      expect(mockAppointmentService.createAppointment).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'tenant-user',
        appointmentData
      );
    });

    it('should return 400 for invalid request body', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' },
        body: 'invalid json'
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Invalid JSON in request body'
        }
      });
    });

    it('should return 400 for missing request body', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' },
        body: null
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Request body is required'
        }
      });
    });
  });

  describe('PUT /tenants/{tenantId}/appointments/{appointmentId}', () => {
    it('should update appointment successfully', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedAppointment = {
        appointmentId: 'app-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        title: 'Updated Title',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        status: 'scheduled' as const,
        reminderMinutes: 60,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.updateAppointment.mockResolvedValue(updatedAppointment);

      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/tenants/tenant-1/appointments/app-1',
        pathParameters: { tenantId: 'tenant-1', appointmentId: 'app-1' },
        body: JSON.stringify(updateData)
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: updatedAppointment
      });
    });

    it('should return 400 when appointment ID is missing', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' },
        body: JSON.stringify({ title: 'Updated Title' })
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Appointment ID is required for updates'
        }
      });
    });
  });

  describe('DELETE /tenants/{tenantId}/appointments/{appointmentId}', () => {
    it('should delete appointment successfully', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.deleteAppointment.mockResolvedValue(true);

      const event = createMockEvent({
        httpMethod: 'DELETE',
        path: '/tenants/tenant-1/appointments/app-1',
        pathParameters: { tenantId: 'tenant-1', appointmentId: 'app-1' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: { message: 'Appointment deleted successfully' }
      });
    });

    it('should return 404 when appointment not found for deletion', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.deleteAppointment.mockResolvedValue(false);

      const event = createMockEvent({
        httpMethod: 'DELETE',
        path: '/tenants/tenant-1/appointments/nonexistent',
        pathParameters: { tenantId: 'tenant-1', appointmentId: 'nonexistent' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Appointment not found'
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported HTTP method', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      const event = createMockEvent({
        httpMethod: 'PATCH',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Method not allowed'
        }
      });
    });

    it('should return 500 for internal server errors', async () => {
      mockAuthService.validateRequest.mockResolvedValue({
        isValid: true,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-user'
      });

      mockAppointmentService.listAppointments.mockRejectedValue(new Error('Database error'));

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/tenants/tenant-1/appointments',
        pathParameters: { tenantId: 'tenant-1' }
      });

      const result = await handler(event, createMockContext());

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          message: 'Internal server error'
        }
      });
    });
  });
});
