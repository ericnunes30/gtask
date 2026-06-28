import { Test, TestingModule } from '@nestjs/testing';
import { DebugLoggerService } from './debug-logger.service';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

describe('DebugLoggerService', () => {
  let service: DebugLoggerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [DebugLoggerService],
    }).compile();

    service = module.get<DebugLoggerService>(DebugLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should create log directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await Test.createTestingModule({
        providers: [DebugLoggerService],
      }).compile();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true }),
      );
    });
  });

  describe('logNotificationEvent', () => {
    it('should log notification event to file', () => {
      const event = 'task.created';
      const payload = { taskId: 1, title: 'Task' };
      const userId = 1;

      service.logNotificationEvent(event, payload, userId);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Event: task.created'),
      );
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"taskId":1'),
      );
    });

    it('should log notification event without userId', () => {
      const event = 'task.updated';
      const payload = { taskId: 2 };

      service.logNotificationEvent(event, payload);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('User: undefined'),
      );
    });
  });

  describe('logWebSocketEvent', () => {
    it('should log WebSocket event to file', () => {
      const event = 'connection';
      const clientId = 'client-123';
      const data = { room: 'notifications' };

      service.logWebSocketEvent(event, clientId, data);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('WebSocket: connection'),
      );
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Client: client-123'),
      );
    });

    it('should log WebSocket event with empty data when not provided', () => {
      const event = 'disconnect';
      const clientId = 'client-456';

      service.logWebSocketEvent(event, clientId);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Data: {}'),
      );
    });
  });

  describe('logError', () => {
    it('should log error to file', () => {
      const error = new Error('Something went wrong');
      const context = 'NotificationService';

      service.logError(error, context);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('ERROR: NotificationService'),
      );
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Something went wrong'),
      );
    });
  });
});
