import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, Socket } from 'socket.io';
import { AuthenticatedSocketAdapter } from './authenticated-socket.adapter';

describe('AuthenticatedSocketAdapter', () => {
  let adapter: AuthenticatedSocketAdapter;
  let mockApp: INestApplicationContext;
  let mockAuthService: { verifyToken: jest.Mock };
  let mockServer: { use: jest.Mock };
  let createIOServerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAuthService = {
      verifyToken: jest.fn(),
    };

    mockApp = {
      get: jest.fn().mockReturnValue(mockAuthService),
    } as unknown as INestApplicationContext;

    mockServer = {
      use: jest.fn(),
    };

    createIOServerSpy = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue(mockServer as unknown as Server);

    adapter = new AuthenticatedSocketAdapter(mockApp);
  });

  afterEach(() => {
    jest.clearAllMocks();
    createIOServerSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('createIOServer', () => {
    it('should create server and attach auth middleware', () => {
      const result = adapter.createIOServer(3000, {});

      expect(createIOServerSpy).toHaveBeenCalledWith(3000, {});
      expect(mockServer.use).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toBe(mockServer);
    });
  });

  describe('authenticateSocket middleware', () => {
    let middleware: (socket: Socket, next: (err?: Error) => void) => void;

    beforeEach(() => {
      adapter.createIOServer(3000, {});
      middleware = mockServer.use.mock.calls[0][0] as (
        socket: Socket,
        next: (err?: Error) => void,
      ) => void;
    });

    it('should authenticate valid token and attach user', () => {
      const userPayload = {
        sub: 1,
        email: 'test@test.com',
        name: 'Test',
      };
      mockAuthService.verifyToken.mockReturnValue(userPayload);

      const mockSocket = {
        handshake: {
          auth: { token: 'valid-token' },
        },
      } as unknown as Socket;
      const mockNext = jest.fn();

      middleware(mockSocket, mockNext);

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(
        (mockSocket as Socket & { user: typeof userPayload }).user,
      ).toEqual(userPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject when no token is provided', () => {
      const mockSocket = {
        handshake: {
          auth: {},
        },
      } as unknown as Socket;
      const mockNext = jest.fn();

      middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new Error('Authentication error: No token provided'),
      );
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should reject when token is not a string', () => {
      const mockSocket = {
        handshake: {
          auth: { token: 123 },
        },
      } as unknown as Socket;
      const mockNext = jest.fn();

      middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new Error('Authentication error: No token provided'),
      );
    });

    it('should reject invalid token', () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const mockSocket = {
        handshake: {
          auth: { token: 'invalid-token' },
        },
      } as unknown as Socket;
      const mockNext = jest.fn();

      middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        new Error('Authentication error: Invalid token'),
      );
    });
  });
});
