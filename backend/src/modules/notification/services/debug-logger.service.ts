import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DebugLoggerService {
  private readonly logger = new Logger(DebugLoggerService.name);
  private readonly logFilePath = 'G:/novosApps/manager-group/backend/server.log';

  constructor() {
    // Ensure log file directory exists
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  logNotificationEvent(event: string, payload: any, userId?: number) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Event: ${event}, Payload: ${JSON.stringify(payload)}, User: ${userId}\n`;
    
    this.logger.log(logMessage.trim());
    fs.appendFileSync(this.logFilePath, logMessage);
  }

  logWebSocketEvent(event: string, clientId: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WebSocket: ${event}, Client: ${clientId}, Data: ${JSON.stringify(data || {})}\n`;
    
    this.logger.log(logMessage.trim());
    fs.appendFileSync(this.logFilePath, logMessage);
  }

  logError(error: Error, context: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${context}, Message: ${error.message}, Stack: ${error.stack}\n`;
    
    this.logger.error(logMessage.trim());
    fs.appendFileSync(this.logFilePath, logMessage);
  }
}