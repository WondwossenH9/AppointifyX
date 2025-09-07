import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import AWSXRay from 'aws-xray-sdk-core';
import { AppointmentService } from '../services/AppointmentService';
import { AuthService } from '../services/AuthService';
import { ResponseHelper } from '../utils/ResponseHelper';
import { Logger } from '../utils/Logger';

// Wrap AWS SDK with X-Ray
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

const appointmentService = new AppointmentService();
const authService = new AuthService();
const logger = new Logger('AppointmentsHandler');

export const handler = AWSXRay.captureLambdaHandler(async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const segment = AWSXRay.getSegment();
  
  try {
    logger.info('Processing appointment request', {
      method: event.httpMethod,
      path: event.path,
      requestId: context.awsRequestId
    });

    // Extract tenant ID from path
    const tenantId = event.pathParameters?.tenantId;
    if (!tenantId) {
      return ResponseHelper.error(400, 'Tenant ID is required');
    }

    // Validate authentication
    const authResult = await authService.validateRequest(event, tenantId);
    if (!authResult.isValid) {
      return ResponseHelper.error(401, 'Unauthorized', authResult.error);
    }

    const userId = authResult.userId;
    const userRole = authResult.role;

    // Route to appropriate handler based on HTTP method
    switch (event.httpMethod) {
      case 'GET':
        if (event.pathParameters?.appointmentId) {
          return await getAppointment(tenantId, event.pathParameters.appointmentId, userId, userRole);
        } else {
          return await listAppointments(tenantId, userId, userRole, event.queryStringParameters);
        }
      
      case 'POST':
        return await createAppointment(tenantId, userId, userRole, event.body);
      
      case 'PUT':
        if (!event.pathParameters?.appointmentId) {
          return ResponseHelper.error(400, 'Appointment ID is required for updates');
        }
        return await updateAppointment(tenantId, event.pathParameters.appointmentId, userId, userRole, event.body);
      
      case 'DELETE':
        if (!event.pathParameters?.appointmentId) {
          return ResponseHelper.error(400, 'Appointment ID is required for deletion');
        }
        return await deleteAppointment(tenantId, event.pathParameters.appointmentId, userId, userRole);
      
      default:
        return ResponseHelper.error(405, 'Method not allowed');
    }

  } catch (error) {
    logger.error('Error processing appointment request', error);
    return ResponseHelper.error(500, 'Internal server error');
  }
});

async function getAppointment(
  tenantId: string,
  appointmentId: string,
  userId: string,
  userRole: string
): Promise<APIGatewayProxyResult> {
  try {
    const appointment = await appointmentService.getAppointment(tenantId, appointmentId, userId, userRole);
    
    if (!appointment) {
      return ResponseHelper.error(404, 'Appointment not found');
    }

    return ResponseHelper.success(200, appointment);
  } catch (error) {
    logger.error('Error getting appointment', error);
    return ResponseHelper.error(500, 'Failed to retrieve appointment');
  }
}

async function listAppointments(
  tenantId: string,
  userId: string,
  userRole: string,
  queryParams: { [key: string]: string } | null
): Promise<APIGatewayProxyResult> {
  try {
    const filters = {
      startDate: queryParams?.startDate,
      endDate: queryParams?.endDate,
      status: queryParams?.status,
      userId: queryParams?.userId
    };

    const appointments = await appointmentService.listAppointments(tenantId, userId, userRole, filters);
    
    return ResponseHelper.success(200, {
      appointments,
      count: appointments.length
    });
  } catch (error) {
    logger.error('Error listing appointments', error);
    return ResponseHelper.error(500, 'Failed to retrieve appointments');
  }
}

async function createAppointment(
  tenantId: string,
  userId: string,
  userRole: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return ResponseHelper.error(400, 'Request body is required');
    }

    const appointmentData = JSON.parse(body);
    const appointment = await appointmentService.createAppointment(tenantId, userId, userRole, appointmentData);
    
    return ResponseHelper.success(201, appointment);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return ResponseHelper.error(400, 'Invalid JSON in request body');
    }
    
    logger.error('Error creating appointment', error);
    return ResponseHelper.error(500, 'Failed to create appointment');
  }
}

async function updateAppointment(
  tenantId: string,
  appointmentId: string,
  userId: string,
  userRole: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return ResponseHelper.error(400, 'Request body is required');
    }

    const updateData = JSON.parse(body);
    const appointment = await appointmentService.updateAppointment(tenantId, appointmentId, userId, userRole, updateData);
    
    if (!appointment) {
      return ResponseHelper.error(404, 'Appointment not found');
    }

    return ResponseHelper.success(200, appointment);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return ResponseHelper.error(400, 'Invalid JSON in request body');
    }
    
    logger.error('Error updating appointment', error);
    return ResponseHelper.error(500, 'Failed to update appointment');
  }
}

async function deleteAppointment(
  tenantId: string,
  appointmentId: string,
  userId: string,
  userRole: string
): Promise<APIGatewayProxyResult> {
  try {
    const success = await appointmentService.deleteAppointment(tenantId, appointmentId, userId, userRole);
    
    if (!success) {
      return ResponseHelper.error(404, 'Appointment not found');
    }

    return ResponseHelper.success(200, { message: 'Appointment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting appointment', error);
    return ResponseHelper.error(500, 'Failed to delete appointment');
  }
}
