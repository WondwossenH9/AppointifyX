import { AppointmentService, Appointment } from '../../src/services/AppointmentService';

// Mock DynamoDB
const mockDynamoDB = {
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn()
};

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => mockDynamoDB)
  }
}));

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockAppointment: Appointment;

  beforeEach(() => {
    appointmentService = new AppointmentService();
    mockAppointment = {
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
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getAppointment', () => {
    it('should return appointment when found', async () => {
      mockDynamoDB.get.mockResolvedValue({
        Item: mockAppointment
      });

      const result = await appointmentService.getAppointment(
        'test-tenant',
        'test-appointment-123',
        'test-user',
        'tenant-user'
      );

      expect(result).toEqual(mockAppointment);
      expect(mockDynamoDB.get).toHaveBeenCalledWith({
        TableName: 'test-appointments',
        Key: {
          PK: 'TENANT#test-tenant#APPOINTMENT#test-appointment-123',
          SK: 'APPOINTMENT#test-appointment-123'
        }
      });
    });

    it('should return null when appointment not found', async () => {
      mockDynamoDB.get.mockResolvedValue({});

      const result = await appointmentService.getAppointment(
        'test-tenant',
        'test-appointment-123',
        'test-user',
        'tenant-user'
      );

      expect(result).toBeNull();
    });

    it('should throw error when user lacks access', async () => {
      const otherUserAppointment = { ...mockAppointment, userId: 'other-user' };
      mockDynamoDB.get.mockResolvedValue({
        Item: otherUserAppointment
      });

      await expect(
        appointmentService.getAppointment(
          'test-tenant',
          'test-appointment-123',
          'test-user',
          'tenant-user'
        )
      ).rejects.toThrow('Access denied');
    });

    it('should allow super admin to access any appointment', async () => {
      const otherUserAppointment = { ...mockAppointment, userId: 'other-user' };
      mockDynamoDB.get.mockResolvedValue({
        Item: otherUserAppointment
      });

      const result = await appointmentService.getAppointment(
        'test-tenant',
        'test-appointment-123',
        'test-user',
        'super-admin'
      );

      expect(result).toEqual(otherUserAppointment);
    });
  });

  describe('listAppointments', () => {
    it('should return appointments for tenant user', async () => {
      mockDynamoDB.query.mockResolvedValue({
        Items: [mockAppointment]
      });

      const result = await appointmentService.listAppointments(
        'test-tenant',
        'test-user',
        'tenant-user'
      );

      expect(result).toEqual([mockAppointment]);
      expect(mockDynamoDB.query).toHaveBeenCalledWith({
        TableName: 'test-appointments',
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :userKey',
        ExpressionAttributeValues: {
          ':userKey': 'TENANT#test-tenant#USER#test-user'
        }
      });
    });

    it('should return all appointments for super admin', async () => {
      mockDynamoDB.query.mockResolvedValue({
        Items: [mockAppointment]
      });

      const result = await appointmentService.listAppointments(
        'test-tenant',
        'test-user',
        'super-admin'
      );

      expect(result).toEqual([mockAppointment]);
      expect(mockDynamoDB.query).toHaveBeenCalledWith({
        TableName: 'test-appointments',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': 'TENANT#test-tenant'
        }
      });
    });

    it('should apply filters correctly', async () => {
      mockDynamoDB.query.mockResolvedValue({
        Items: [mockAppointment]
      });

      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'scheduled'
      };

      await appointmentService.listAppointments(
        'test-tenant',
        'test-user',
        'tenant-user',
        filters
      );

      expect(mockDynamoDB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'startTime >= :startDate AND startTime <= :endDate AND #status = :status',
          ExpressionAttributeValues: expect.objectContaining({
            ':startDate': '2024-01-01',
            ':endDate': '2024-01-31',
            ':status': 'scheduled'
          }),
          ExpressionAttributeNames: {
            '#status': 'status'
          }
        })
      );
    });
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      mockDynamoDB.put.mockResolvedValue({});

      const appointmentData = {
        title: 'New Appointment',
        description: 'New Description',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        location: 'New Location',
        attendees: ['new@example.com'],
        reminderMinutes: 30
      };

      const result = await appointmentService.createAppointment(
        'test-tenant',
        'test-user',
        'tenant-user',
        appointmentData
      );

      expect(result).toMatchObject({
        tenantId: 'test-tenant',
        userId: 'test-user',
        title: 'New Appointment',
        status: 'scheduled'
      });
      expect(result.appointmentId).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      expect(mockDynamoDB.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-appointments',
          Item: expect.objectContaining({
            PK: expect.stringContaining('TENANT#test-tenant#APPOINTMENT#'),
            SK: expect.stringContaining('APPOINTMENT#'),
            GSI1PK: 'TENANT#test-tenant',
            GSI2PK: 'TENANT#test-tenant#USER#test-user'
          }),
          ConditionExpression: 'attribute_not_exists(PK)'
        })
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = {
        title: '', // Empty title should fail
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T09:00:00Z' // End time before start time
      };

      await expect(
        appointmentService.createAppointment(
          'test-tenant',
          'test-user',
          'tenant-user',
          invalidData
        )
      ).rejects.toThrow('Validation error');
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment successfully', async () => {
      mockDynamoDB.get.mockResolvedValue({
        Item: mockAppointment
      });
      mockDynamoDB.update.mockResolvedValue({
        Attributes: { ...mockAppointment, title: 'Updated Title' }
      });

      const updateData = { title: 'Updated Title' };

      const result = await appointmentService.updateAppointment(
        'test-tenant',
        'test-appointment-123',
        'test-user',
        'tenant-user',
        updateData
      );

      expect(result?.title).toBe('Updated Title');
      expect(mockDynamoDB.update).toHaveBeenCalled();
    });

    it('should return null when appointment not found', async () => {
      mockDynamoDB.get.mockResolvedValue({});

      const result = await appointmentService.updateAppointment(
        'test-tenant',
        'test-appointment-123',
        'test-user',
        'tenant-user',
        { title: 'Updated Title' }
      );

      expect(result).toBeNull();
    });

    it('should throw error when user lacks permission', async () => {
      const otherUserAppointment = { ...mockAppointment, userId: 'other-user' };
      mockDynamoDB.get.mockResolvedValue({
        Item: otherUserAppointment
      });

      await expect(
        appointmentService.updateAppointment(
          'test-tenant',
          'test-appointment-123',
          'test-user',
          'tenant-user',
          { title: 'Updated Title' }
        )
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteAppointment', () => {
    it('should delete appointment successfully', async () => {
      mockDynamoDB.get.mockResolvedValue({
        Item: mockAppointment
      });
      mockDynamoDB.delete.mockResolvedValue({});

      const result = await appointmentService.deleteAppointment(
        'test-tenant',
        'test-appointment-123',
        'test-user',
        'tenant-user'
      );

      expect(result).toBe(true);
      expect(mockDynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'test-appointments',
        Key: {
          PK: 'TENANT#test-tenant#APPOINTMENT#test-appointment-123',
          SK: 'APPOINTMENT#test-appointment-123'
        }
      });
    });

    it('should return false when appointment not found', async () => {
      mockDynamoDB.get.mockResolvedValue({});

      const result = await appointmentService.deleteAppointment(
        'test-tenant',
        'test-appointment-123',
        'test-user',
        'tenant-user'
      );

      expect(result).toBe(false);
    });
  });
});
