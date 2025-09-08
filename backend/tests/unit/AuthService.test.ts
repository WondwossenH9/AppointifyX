import { AuthService } from '../../src/services/AuthService';

// Mock Cognito
const mockCognito = {
  adminGetUser: jest.fn(),
  adminCreateUser: jest.fn(),
  adminAddUserToGroup: jest.fn()
};

jest.mock('aws-sdk', () => ({
  CognitoIdentityProvider: jest.fn(() => mockCognito)
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn()
}));

describe('AuthService', () => {
  let authService: AuthService;
  const mockJWT = require('jsonwebtoken');

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate request successfully for tenant user', async () => {
      const mockToken = {
        sub: 'test-user-id',
        'cognito:groups': ['tenant-user'],
        'custom:tenant_id': 'test-tenant',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockJWT.decode.mockReturnValue(mockToken);

      const event = {
        headers: { Authorization: 'Bearer valid-token' },
        pathParameters: { tenantId: 'test-tenant' }
      };

      const result = await authService.validateRequest(event, 'test-tenant');

      expect(result).toEqual({
        isValid: true,
        userId: 'test-user-id',
        tenantId: 'test-tenant',
        role: 'tenant-user'
      });
    });

    it('should validate request successfully for super admin', async () => {
      const mockToken = {
        sub: 'admin-user-id',
        'cognito:groups': ['super-admin'],
        'custom:tenant_id': 'admin-tenant',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockJWT.decode.mockReturnValue(mockToken);

      const event = {
        headers: { Authorization: 'Bearer valid-token' },
        pathParameters: { tenantId: 'any-tenant' }
      };

      const result = await authService.validateRequest(event, 'any-tenant');

      expect(result).toEqual({
        isValid: true,
        userId: 'admin-user-id',
        tenantId: 'any-tenant',
        role: 'super-admin'
      });
    });

    it('should reject request without authorization header', async () => {
      const event = {
        headers: {},
        pathParameters: { tenantId: 'test-tenant' }
      };

      const result = await authService.validateRequest(event, 'test-tenant');

      expect(result).toEqual({
        isValid: false,
        error: 'Authorization header is required'
      });
    });

    it('should reject request with invalid token', async () => {
      mockJWT.decode.mockReturnValue(null);

      const event = {
        headers: { Authorization: 'Bearer invalid-token' },
        pathParameters: { tenantId: 'test-tenant' }
      };

      const result = await authService.validateRequest(event, 'test-tenant');

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid token'
      });
    });

    it('should reject request with expired token', async () => {
      const mockToken = {
        sub: 'test-user-id',
        'cognito:groups': ['tenant-user'],
        'custom:tenant_id': 'test-tenant',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      mockJWT.decode.mockReturnValue(mockToken);

      const event = {
        headers: { Authorization: 'Bearer expired-token' },
        pathParameters: { tenantId: 'test-tenant' }
      };

      const result = await authService.validateRequest(event, 'test-tenant');

      expect(result).toEqual({
        isValid: false,
        error: 'Invalid token'
      });
    });

    it('should reject request when user lacks tenant access', async () => {
      const mockToken = {
        sub: 'test-user-id',
        'cognito:groups': ['tenant-user'],
        'custom:tenant_id': 'different-tenant',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockJWT.decode.mockReturnValue(mockToken);

      const event = {
        headers: { Authorization: 'Bearer valid-token' },
        pathParameters: { tenantId: 'test-tenant' }
      };

      const result = await authService.validateRequest(event, 'test-tenant');

      expect(result).toEqual({
        isValid: false,
        error: 'Access denied to tenant'
      });
    });

    it('should handle malformed authorization header', async () => {
      const event = {
        headers: { Authorization: 'InvalidFormat token' },
        pathParameters: { tenantId: 'test-tenant' }
      };

      const result = await authService.validateRequest(event, 'test-tenant');

      expect(result).toEqual({
        isValid: false,
        error: 'Bearer token is required'
      });
    });
  });

  describe('getUserInfo', () => {
    it('should return user info successfully', async () => {
      const mockUserData = {
        Username: 'test-user',
        Enabled: true,
        UserStatus: 'CONFIRMED',
        UserCreateDate: new Date('2024-01-01'),
        UserLastModifiedDate: new Date('2024-01-01'),
        UserAttributes: [
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'custom:tenant_id', Value: 'test-tenant' },
          { Name: 'custom:role', Value: 'tenant-user' }
        ]
      };

      mockCognito.adminGetUser.mockResolvedValue(mockUserData);

      const result = await authService.getUserInfo('test-user');

      expect(result).toEqual({
        userId: 'test-user',
        enabled: true,
        status: 'CONFIRMED',
        createdAt: new Date('2024-01-01'),
        lastModified: new Date('2024-01-01'),
        email: 'test@example.com',
        tenantId: 'test-tenant',
        role: 'tenant-user'
      });

      expect(mockCognito.adminGetUser).toHaveBeenCalledWith({
        UserPoolId: 'test-pool-id',
        Username: 'test-user'
      });
    });

    it('should handle user not found', async () => {
      mockCognito.adminGetUser.mockRejectedValue(new Error('User not found'));

      await expect(authService.getUserInfo('nonexistent-user'))
        .rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const mockCreatedUser = {
        User: {
          Username: 'new-user',
          UserStatus: 'FORCE_CHANGE_PASSWORD'
        }
      };

      mockCognito.adminCreateUser.mockResolvedValue(mockCreatedUser);
      mockCognito.adminAddUserToGroup.mockResolvedValue({});

      const userData = {
        email: 'new@example.com',
        password: 'TempPassword123!',
        tenantId: 'test-tenant',
        role: 'tenant-user'
      };

      const result = await authService.createUser(userData);

      expect(result).toEqual(mockCreatedUser.User);
      expect(mockCognito.adminCreateUser).toHaveBeenCalledWith({
        UserPoolId: 'test-pool-id',
        Username: 'new@example.com',
        UserAttributes: [
          { Name: 'email', Value: 'new@example.com' },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:tenant_id', Value: 'test-tenant' },
          { Name: 'custom:role', Value: 'tenant-user' }
        ],
        TemporaryPassword: 'TempPassword123!',
        MessageAction: 'SUPPRESS'
      });
      expect(mockCognito.adminAddUserToGroup).toHaveBeenCalledWith({
        UserPoolId: 'test-pool-id',
        Username: 'new@example.com',
        GroupName: 'tenant-user'
      });
    });

    it('should handle user creation failure', async () => {
      mockCognito.adminCreateUser.mockRejectedValue(new Error('User already exists'));

      const userData = {
        email: 'existing@example.com',
        password: 'TempPassword123!',
        tenantId: 'test-tenant',
        role: 'tenant-user'
      };

      await expect(authService.createUser(userData))
        .rejects.toThrow('User already exists');
    });
  });
});
