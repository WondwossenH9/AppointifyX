export class ResponseHelper {
  static success(statusCode: number, data: any): any {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data
      })
    };
  }

  static error(statusCode: number, message: string, details?: any): any {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: {
          message,
          details
        }
      })
    };
  }

  static validationError(errors: string[]): any {
    return this.error(400, 'Validation failed', { errors });
  }

  static unauthorized(message: string = 'Unauthorized'): any {
    return this.error(401, message);
  }

  static forbidden(message: string = 'Forbidden'): any {
    return this.error(403, message);
  }

  static notFound(message: string = 'Resource not found'): any {
    return this.error(404, message);
  }

  static internalError(message: string = 'Internal server error'): any {
    return this.error(500, message);
  }
}
