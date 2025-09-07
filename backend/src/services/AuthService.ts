import { CognitoIdentityProvider } from 'aws-sdk';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';

export interface AuthResult {
  isValid: boolean;
  userId?: string;
  tenantId?: string;
  role?: string;
  error?: string;
}

export class AuthService {
  private cognito: CognitoIdentityProvider;
  private logger: Logger;

  constructor() {
    this.cognito = new CognitoIdentityProvider();
    this.logger = new Logger('AuthService');
  }

  async validateRequest(event: any, requestedTenantId: string): Promise<AuthResult> {
    try {
      // Extract token from Authorization header
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      if (!authHeader) {
        return {
          isValid: false,
          error: 'Authorization header is required'
        };
      }

      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return {
          isValid: false,
          error: 'Bearer token is required'
        };
      }

      // Verify JWT token with Cognito
      const decodedToken = await this.verifyToken(token);
      if (!decodedToken) {
        return {
          isValid: false,
          error: 'Invalid token'
        };
      }

      // Extract user information
      const userId = decodedToken.sub;
      const userGroups = decodedToken['cognito:groups'] || [];
      const userTenantId = decodedToken['custom:tenant_id'];

      // Check if user has access to the requested tenant
      if (!this.hasTenantAccess(userGroups, userTenantId, requestedTenantId)) {
        return {
          isValid: false,
          error: 'Access denied to tenant'
        };
      }

      // Determine user role
      const role = this.determineUserRole(userGroups);

      return {
        isValid: true,
        userId,
        tenantId: requestedTenantId,
        role
      };

    } catch (error) {
      this.logger.error('Error validating request', error);
      return {
        isValid: false,
        error: 'Authentication failed'
      };
    }
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      // For development, we'll decode the token without verification
      // In production, you should verify the token signature with Cognito
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || typeof decoded === 'string') {
        return null;
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.payload.exp && decoded.payload.exp < now) {
        return null;
      }

      return decoded.payload;
    } catch (error) {
      this.logger.error('Error verifying token', error);
      return null;
    }
  }

  private hasTenantAccess(userGroups: string[], userTenantId: string, requestedTenantId: string): boolean {
    // Super admin has access to all tenants
    if (userGroups.includes('super-admin')) {
      return true;
    }

    // Tenant admin and users can only access their own tenant
    if (userGroups.includes('tenant-admin') || userGroups.includes('tenant-user')) {
      return userTenantId === requestedTenantId;
    }

    return false;
  }

  private determineUserRole(userGroups: string[]): string {
    if (userGroups.includes('super-admin')) {
      return 'super-admin';
    }
    
    if (userGroups.includes('tenant-admin')) {
      return 'tenant-admin';
    }
    
    if (userGroups.includes('tenant-user')) {
      return 'tenant-user';
    }

    return 'tenant-user'; // Default role
  }

  async getUserInfo(userId: string): Promise<any> {
    try {
      const params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: userId
      };

      const result = await this.cognito.adminGetUser(params).promise();
      
      // Extract user attributes
      const userInfo: any = {
        userId: result.Username,
        enabled: result.Enabled,
        status: result.UserStatus,
        createdAt: result.UserCreateDate,
        lastModified: result.UserLastModifiedDate
      };

      // Parse attributes
      result.UserAttributes?.forEach(attr => {
        switch (attr.Name) {
          case 'email':
            userInfo.email = attr.Value;
            break;
          case 'custom:tenant_id':
            userInfo.tenantId = attr.Value;
            break;
          case 'custom:role':
            userInfo.role = attr.Value;
            break;
        }
      });

      return userInfo;
    } catch (error) {
      this.logger.error('Error getting user info', error);
      throw error;
    }
  }

  async createUser(userData: {
    email: string;
    password: string;
    tenantId: string;
    role: string;
  }): Promise<any> {
    try {
      const params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: userData.email,
        UserAttributes: [
          {
            Name: 'email',
            Value: userData.email
          },
          {
            Name: 'email_verified',
            Value: 'true'
          },
          {
            Name: 'custom:tenant_id',
            Value: userData.tenantId
          },
          {
            Name: 'custom:role',
            Value: userData.role
          }
        ],
        TemporaryPassword: userData.password,
        MessageAction: 'SUPPRESS' // Don't send welcome email
      };

      const result = await this.cognito.adminCreateUser(params).promise();

      // Add user to appropriate group
      await this.addUserToGroup(userData.email, userData.role);

      return result.User;
    } catch (error) {
      this.logger.error('Error creating user', error);
      throw error;
    }
  }

  private async addUserToGroup(username: string, role: string): Promise<void> {
    try {
      const groupName = this.getGroupNameForRole(role);
      
      const params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: username,
        GroupName: groupName
      };

      await this.cognito.adminAddUserToGroup(params).promise();
    } catch (error) {
      this.logger.error('Error adding user to group', error);
      throw error;
    }
  }

  private getGroupNameForRole(role: string): string {
    switch (role) {
      case 'super-admin':
        return 'super-admin';
      case 'tenant-admin':
        return 'tenant-admin';
      case 'tenant-user':
      default:
        return 'tenant-user';
    }
  }
}
