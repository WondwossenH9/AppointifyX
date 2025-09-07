export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(data && { data })
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  error(message: string, error?: any): void {
    const errorData = error ? {
      error: error.message || error,
      stack: error.stack
    } : undefined;
    
    console.error(this.formatMessage('ERROR', message, errorData));
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }
}
