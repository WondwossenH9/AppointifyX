import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import Joi from 'joi';
import { Logger } from '../utils/Logger';

// Validation schemas
const appointmentSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().optional().max(1000),
  startTime: Joi.date().iso().required(),
  endTime: Joi.date().iso().required().greater(Joi.ref('startTime')),
  location: Joi.string().optional().max(200),
  attendees: Joi.array().items(Joi.string().email()).optional(),
  status: Joi.string().valid('scheduled', 'confirmed', 'cancelled', 'completed').default('scheduled'),
  reminderMinutes: Joi.number().min(0).max(10080).default(60) // Max 1 week
});

const updateAppointmentSchema = Joi.object({
  title: Joi.string().optional().min(1).max(200),
  description: Joi.string().optional().max(1000),
  startTime: Joi.date().iso().optional(),
  endTime: Joi.date().iso().optional(),
  location: Joi.string().optional().max(200),
  attendees: Joi.array().items(Joi.string().email()).optional(),
  status: Joi.string().valid('scheduled', 'confirmed', 'cancelled', 'completed').optional(),
  reminderMinutes: Joi.number().min(0).max(10080).optional()
}).min(1); // At least one field must be provided

export interface Appointment {
  appointmentId: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  reminderMinutes: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number; // For automatic cleanup
}

export interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  userId?: string;
}

export class AppointmentService {
  private dynamodb: DynamoDB.DocumentClient;
  private logger: Logger;

  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient();
    this.logger = new Logger('AppointmentService');
  }

  async getAppointment(
    tenantId: string,
    appointmentId: string,
    userId: string,
    userRole: string
  ): Promise<Appointment | null> {
    try {
      const params: DynamoDB.DocumentClient.GetItemInput = {
        TableName: process.env.APPOINTMENTS_TABLE_NAME!,
        Key: {
          PK: `TENANT#${tenantId}#APPOINTMENT#${appointmentId}`,
          SK: `APPOINTMENT#${appointmentId}`
        }
      };

      const result = await this.dynamodb.get(params).promise();
      
      if (!result.Item) {
        return null;
      }

      const appointment = result.Item as Appointment;
      
      // Check if user has access to this appointment
      if (userRole !== 'super-admin' && appointment.userId !== userId) {
        throw new Error('Access denied');
      }

      return appointment;
    } catch (error) {
      this.logger.error('Error getting appointment', error);
      throw error;
    }
  }

  async listAppointments(
    tenantId: string,
    userId: string,
    userRole: string,
    filters: AppointmentFilters = {}
  ): Promise<Appointment[]> {
    try {
      let params: DynamoDB.DocumentClient.QueryInput;

      if (userRole === 'super-admin') {
        // Super admin can see all appointments for the tenant
        params = {
          TableName: process.env.APPOINTMENTS_TABLE_NAME!,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :tenantId',
          ExpressionAttributeValues: {
            ':tenantId': `TENANT#${tenantId}`
          }
        };
      } else {
        // Regular users can only see their own appointments
        params = {
          TableName: process.env.APPOINTMENTS_TABLE_NAME!,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :userKey',
          ExpressionAttributeValues: {
            ':userKey': `TENANT#${tenantId}#USER#${userId}`
          }
        };
      }

      // Add filters
      const filterExpressions: string[] = [];
      const expressionAttributeValues: { [key: string]: any } = { ...params.ExpressionAttributeValues };

      if (filters.startDate) {
        filterExpressions.push('startTime >= :startDate');
        expressionAttributeValues[':startDate'] = filters.startDate;
      }

      if (filters.endDate) {
        filterExpressions.push('startTime <= :endDate');
        expressionAttributeValues[':endDate'] = filters.endDate;
      }

      if (filters.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
        params.ExpressionAttributeValues = expressionAttributeValues;
        params.ExpressionAttributeNames = {
          '#status': 'status'
        };
      }

      const result = await this.dynamodb.query(params).promise();
      return (result.Items || []) as Appointment[];
    } catch (error) {
      this.logger.error('Error listing appointments', error);
      throw error;
    }
  }

  async createAppointment(
    tenantId: string,
    userId: string,
    userRole: string,
    appointmentData: any
  ): Promise<Appointment> {
    try {
      // Validate input data
      const { error, value } = appointmentSchema.validate(appointmentData);
      if (error) {
        throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
      }

      const appointmentId = uuidv4();
      const now = new Date().toISOString();
      
      // Calculate TTL for automatic cleanup (1 year from creation)
      const ttl = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

      const appointment: Appointment = {
        appointmentId,
        tenantId,
        userId,
        title: value.title,
        description: value.description,
        startTime: value.startTime,
        endTime: value.endTime,
        location: value.location,
        attendees: value.attendees || [],
        status: value.status,
        reminderMinutes: value.reminderMinutes,
        createdAt: now,
        updatedAt: now,
        ttl
      };

      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.APPOINTMENTS_TABLE_NAME!,
        Item: {
          PK: `TENANT#${tenantId}#APPOINTMENT#${appointmentId}`,
          SK: `APPOINTMENT#${appointmentId}`,
          GSI1PK: `TENANT#${tenantId}`,
          GSI1SK: `DATE#${moment(value.startTime).format('YYYY-MM-DD')}#TIME#${moment(value.startTime).format('HH:mm:ss')}`,
          GSI2PK: `TENANT#${tenantId}#USER#${userId}`,
          GSI2SK: `DATE#${moment(value.startTime).format('YYYY-MM-DD')}#TIME#${moment(value.startTime).format('HH:mm:ss')}`,
          ...appointment
        },
        ConditionExpression: 'attribute_not_exists(PK)' // Prevent overwrites
      };

      await this.dynamodb.put(params).promise();
      
      this.logger.info('Appointment created successfully', { appointmentId, tenantId, userId });
      return appointment;
    } catch (error) {
      this.logger.error('Error creating appointment', error);
      throw error;
    }
  }

  async updateAppointment(
    tenantId: string,
    appointmentId: string,
    userId: string,
    userRole: string,
    updateData: any
  ): Promise<Appointment | null> {
    try {
      // Validate input data
      const { error, value } = updateAppointmentSchema.validate(updateData);
      if (error) {
        throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
      }

      // Get existing appointment
      const existingAppointment = await this.getAppointment(tenantId, appointmentId, userId, userRole);
      if (!existingAppointment) {
        return null;
      }

      // Check if user has permission to update
      if (userRole !== 'super-admin' && existingAppointment.userId !== userId) {
        throw new Error('Access denied');
      }

      const now = new Date().toISOString();
      const updatedAppointment = {
        ...existingAppointment,
        ...value,
        updatedAt: now
      };

      // If startTime or endTime changed, update GSI keys
      let updateExpression = 'SET updatedAt = :updatedAt';
      const expressionAttributeValues: { [key: string]: any } = {
        ':updatedAt': now
      };
      const expressionAttributeNames: { [key: string]: string } = {};

      Object.keys(value).forEach((key, index) => {
        updateExpression += `, #attr${index} = :val${index}`;
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = value[key];
      });

      const params: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: process.env.APPOINTMENTS_TABLE_NAME!,
        Key: {
          PK: `TENANT#${tenantId}#APPOINTMENT#${appointmentId}`,
          SK: `APPOINTMENT#${appointmentId}`
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.dynamodb.update(params).promise();
      
      this.logger.info('Appointment updated successfully', { appointmentId, tenantId, userId });
      return result.Attributes as Appointment;
    } catch (error) {
      this.logger.error('Error updating appointment', error);
      throw error;
    }
  }

  async deleteAppointment(
    tenantId: string,
    appointmentId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    try {
      // Get existing appointment to check permissions
      const existingAppointment = await this.getAppointment(tenantId, appointmentId, userId, userRole);
      if (!existingAppointment) {
        return false;
      }

      // Check if user has permission to delete
      if (userRole !== 'super-admin' && existingAppointment.userId !== userId) {
        throw new Error('Access denied');
      }

      const params: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: process.env.APPOINTMENTS_TABLE_NAME!,
        Key: {
          PK: `TENANT#${tenantId}#APPOINTMENT#${appointmentId}`,
          SK: `APPOINTMENT#${appointmentId}`
        }
      };

      await this.dynamodb.delete(params).promise();
      
      this.logger.info('Appointment deleted successfully', { appointmentId, tenantId, userId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting appointment', error);
      throw error;
    }
  }
}
