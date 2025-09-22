import { Test, TestingModule } from '@nestjs/testing';
import { INestApplicationContext } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthenticatedSocketAdapter } from '../../src/modules/events/adapters/authenticated-socket.adapter';
import { AuthService } from '../../src/modules/auth/services/auth.service';

// Mock socket.io types
declare module 'socket.io' {
  interface Socket {
    user?: any;
  }
}

describe('AuthenticatedSocketAdapter', () => {
  let adapter: AuthenticatedSocketAdapter;
  let authService: jest.Mocked<AuthService>;
  let mockApp: jest.Mocked<INestApplicationContext>;
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(async () => {
    // Mock AuthService
    authService = {
      verifyToken: jest.fn(),
    } as any;

    // Mock Nest application context
    mockApp = {
      get: jest.fn().mockReturnValue(authService),
    } as any;

    // Mock Socket.IO server
    mockServer = {
      use: jest.fn(),
    } as any;

    // Create adapter instance
    adapter = new AuthenticatedSocketAdapter(mockApp);
  });

  describe('createIOServer', () => {
    let middleware: (socket: Socket, next: Function) => void;
    let mockNext: jest.Mock;

    beforeEach(() => {
      const mockPort = 3000;
      const mockOptions = { cors: { origin: '*' } };

      // Mock the parent class createIOServer method
      const superCreateIOServer = jest.spyOn(AuthenticatedSocketAdapter.prototype as any, 'createIOServer');
      superCreateIOServer.mockReturnValue(mockServer);

      adapter.createIOServer(mockPort, mockOptions);

      expect(superCreateIOServer).toHaveBeenCalledWith(mockPort, mockOptions);
      expect(mockServer.use).toHaveBeenCalledTimes(1);

      // Get the middleware function
      middleware = mockServer.use.mock.calls[0][0];
      mockNext = jest.fn();
    });

    it('should create server with authentication middleware', () => {
      const mockPort = 3000;
      const mockOptions = { cors: { origin: '*' } };

      // Mock the parent class createIOServer method
      const superCreateIOServer = jest.spyOn(AuthenticatedSocketAdapter.prototype as any, 'createIOServer');
      superCreateIOServer.mockReturnValue(mockServer);

      const result = adapter.createIOServer(mockPort, mockOptions);

      expect(superCreateIOServer).toHaveBeenCalledWith(mockPort, mockOptions);
      expect(mockServer.use).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockServer);
    });

    it('should call authentication middleware with correct parameters', () => {
      const middlewareCall = mockServer.use.mock.calls[0];
      expect(middlewareCall).toHaveLength(1);
      expect(typeof middlewareCall[0]).toBe('function');
    });

    describe('Authentication Middleware', () => {
      it('should reject connection when no token is provided', () => {
        mockSocket = {
          handshake: {
            auth: {},
          },
        } as any;

        middleware(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: No token provided')
        );
        expect(authService.verifyToken).not.toHaveBeenCalled();
        expect(mockSocket.user).toBeUndefined();
      });

      it('should reject connection when token is undefined', () => {
        mockSocket = {
          handshake: {
            auth: { token: undefined },
          },
        } as any;

        middleware(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: No token provided')
        );
        expect(authService.verifyToken).not.toHaveBeenCalled();
      });

      it('should reject connection when token is null', () => {
        mockSocket = {
          handshake: {
            auth: { token: null },
          },
        } as any;

        middleware(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: No token provided')
        );
        expect(authService.verifyToken).not.toHaveBeenCalled();
      });

      it('should reject connection when token is empty string', () => {
        mockSocket = {
          handshake: {
            auth: { token: '' },
          },
        } as any;

        middleware(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: No token provided')
        );
        expect(authService.verifyToken).not.toHaveBeenCalled();
      });

      it('should reject connection when token verification fails', async () => {
        const mockToken = 'invalid-token';
        const authError = new Error('Invalid token');

        mockSocket = {
          handshake: {
            auth: { token: mockToken },
          },
        } as any;

        authService.verifyToken.mockRejectedValue(authError);

        await middleware(mockSocket, mockNext);

        expect(authService.verifyToken).toHaveBeenCalledWith(mockToken);
        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: Invalid token')
        );
        expect(mockSocket.user).toBeUndefined();
      });

      it('should accept connection and attach user payload when token is valid', async () => {
        const mockToken = 'valid-token';
        const mockUserPayload = {
          sub: 1,
          email: 'test@example.com',
          name: 'Test User',
          roles: ['user'],
        };

        mockSocket = {
          handshake: {
            auth: { token: mockToken },
          },
        } as any;

        authService.verifyToken.mockResolvedValue(mockUserPayload);

        await middleware(mockSocket, mockNext);

        expect(authService.verifyToken).toHaveBeenCalledWith(mockToken);
        expect(mockSocket.user).toBe(mockUserPayload);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle different token payload structures', async () => {
        const mockToken = 'valid-token';
        const mockUserPayload = {
          userId: 123,
          username: 'testuser',
          permissions: ['read', 'write'],
        };

        mockSocket = {
          handshake: {
            auth: { token: mockToken },
          },
        } as any;

        authService.verifyToken.mockResolvedValue(mockUserPayload);

        await middleware(mockSocket, mockNext);

        expect(mockSocket.user).toBe(mockUserPayload);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle token verification errors with specific messages', async () => {
        const mockToken = 'expired-token';
        const authError = new Error('Token expired');

        mockSocket = {
          handshake: {
            auth: { token: mockToken },
          },
        } as any;

        authService.verifyToken.mockRejectedValue(authError);

        await middleware(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: Invalid token')
        );
      });

      it('should handle synchronous token verification', async () => {
        const mockToken = 'valid-token';
        const mockUserPayload = { sub: 1 };

        mockSocket = {
          handshake: {
            auth: { token: mockToken },
          },
        } as any;

        authService.verifyToken.mockResolvedValue(mockUserPayload);

        await middleware(mockSocket, mockNext);

        expect(mockSocket.user).toBe(mockUserPayload);
      });

      it('should not modify existing socket properties', async () => {
        const mockToken = 'valid-token';
        const mockUserPayload = { sub: 1 };
        const existingProperty = 'existing-value';

        mockSocket = {
          handshake: {
            auth: { token: mockToken },
          },
          existingProperty: existingProperty,
        } as any;

        authService.verifyToken.mockResolvedValue(mockUserPayload);

        await middleware(mockSocket, mockNext);

        expect(mockSocket.user).toBe(mockUserPayload);
        expect((mockSocket as any).existingProperty).toBe(existingProperty);
      });

      it('should handle malformed socket handshake', async () => {
        const mockSocket = {
          handshake: null,
        } as any;

        const mockNext = jest.fn();

        middleware(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: No token provided')
        );
      });

      it('should handle socket with no handshake property', async () => {
        const mockSocket = {} as any;
        const mockNext = jest.fn();

        middleware(mockSocket, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          new Error('Authentication error: No token provided')
        );
      });
    });
  });

  describe('Constructor', () => {
    it('should initialize with Nest application context', () => {
      expect(adapter).toBeInstanceOf(AuthenticatedSocketAdapter);
      expect((adapter as any).app).toBe(mockApp);
      expect((adapter as any).authService).toBe(authService);
    });

    it('should get AuthService from application context', () => {
      expect(mockApp.get).toHaveBeenCalledWith(AuthService);
    });

    it('should handle AuthService retrieval failure', () => {
      const error = new Error('Service not found');
      mockApp.get.mockImplementation(() => {
        throw error;
      });

      expect(() => new AuthenticatedSocketAdapter(mockApp)).toThrow(error);
    });
  });

  describe('Type Extensions', () => {
    it('should allow user property on socket interface', () => {
      const socket: Socket = {} as Socket;
      // This test ensures TypeScript compilation works with the extended interface
      socket.user = { sub: 1 };
      expect(socket.user).toBeDefined();
    });

    it('should handle optional user property', () => {
      const socket: Socket = {} as Socket;
      expect(socket.user).toBeUndefined();
    });
  });
});