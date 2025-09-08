// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      get: jest.fn().mockReturnThis(),
      put: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      query: jest.fn().mockReturnThis(),
      scan: jest.fn().mockReturnThis(),
      promise: jest.fn()
    }))
  },
  CognitoIdentityServiceProvider: jest.fn(() => ({
    adminGetUser: jest.fn().mockReturnThis(),
    adminCreateUser: jest.fn().mockReturnThis(),
    adminAddUserToGroup: jest.fn().mockReturnThis(),
    promise: jest.fn()
  }))
}));

// Mock environment variables
process.env['APPOINTMENTS_TABLE_NAME'] = 'test-appointments';
process.env['TENANTS_TABLE_NAME'] = 'test-tenants';
process.env['USERS_TABLE_NAME'] = 'test-users';
process.env['COGNITO_USER_POOL_ID'] = 'test-pool-id';
process.env['NODE_ENV'] = 'test';

// Global test utilities
(global as any).createMockEvent = (overrides: any = {}) => ({
  httpMethod: 'GET',
  path: '/tenants/test-tenant/appointments',
  pathParameters: { tenantId: 'test-tenant' },
  headers: {
    'Authorization': 'Bearer mock-jwt-token',
    'Content-Type': 'application/json'
  },
  body: null as any,
  queryStringParameters: null as any,
  ...overrides
});

(global as any).createMockContext = () => ({
  awsRequestId: 'test-request-id',
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
  memoryLimitInMB: '128',
  remainingTimeInMillis: 30000
});

// Mock JWT token
(global as any).createMockJWT = (overrides: any = {}) => ({
  sub: 'test-user-id',
  'cognito:groups': ['tenant-user'],
  'custom:tenant_id': 'test-tenant',
  email: 'test@example.com',
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  iat: Math.floor(Date.now() / 1000),
  ...overrides
});
