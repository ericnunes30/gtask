import { Test, TestingModule } from '@nestjs/testing';
import { AuthResponseFactory } from './auth-response.factory';
import { LoginResponseStrategy } from './auth-response.factory';
import { DetailedLoginResponseStrategy } from './auth-response.factory';

describe('AuthResponseFactory', () => {
  let factory: AuthResponseFactory;
  let loginStrategy: LoginResponseStrategy;
  let detailedStrategy: DetailedLoginResponseStrategy;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    roles: [{ id: 1, name: 'user' }, { id: 2, name: 'admin' }],
  };

  const mockUserWithoutRoles = {
    id: 2,
    email: 'no-roles@example.com',
    name: 'No Roles User',
    roles: [],
  };

  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    loginStrategy = new LoginResponseStrategy();
    detailedStrategy = new DetailedLoginResponseStrategy();
    factory = new AuthResponseFactory();
  });

  describe('constructor', () => {
    it('should be properly initialized with strategies', () => {
      expect(factory).toBeDefined();
    });
  });

  describe('createLoginResponse', () => {
    it('should use DetailedLoginResponseStrategy when context is "detailed"', () => {
      const result = factory.createLoginResponse(mockAccessToken, mockUser, 'detailed');

      expect(result).toEqual({
        access_token: mockAccessToken,
        refresh_token: null,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          roles: mockUser.roles,
        },
        expires_in: 86400,
      });
    });

    it('should use LoginResponseStrategy when context is "login"', () => {
      const result = factory.createLoginResponse(mockAccessToken, mockUser, 'login');

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });
    });

    it('should use LoginResponseStrategy when no context is provided', () => {
      const result = factory.createLoginResponse(mockAccessToken, mockUser);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });
    });

    it('should use LoginResponseStrategy when context is empty string', () => {
      const result = factory.createLoginResponse(mockAccessToken, mockUser, '');

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });
    });

    it('should use DetailedLoginResponseStrategy with user without roles', () => {
      const result = factory.createLoginResponse(mockAccessToken, mockUserWithoutRoles, 'detailed');

      expect(result).toEqual({
        access_token: mockAccessToken,
        refresh_token: null,
        user: {
          id: mockUserWithoutRoles.id,
          name: mockUserWithoutRoles.name,
          email: mockUserWithoutRoles.email,
          roles: [],
        },
        expires_in: 86400,
      });
    });

    it('should throw error when no strategy can handle the context', () => {
      expect(() => factory.createLoginResponse(mockAccessToken, mockUser, 'invalid-context')).toThrow(
        `No auth response strategy found for context: invalid-context`,
      );
    });

    it('should handle user with additional fields', () => {
      const extendedUser = {
        ...mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        preferences: { theme: 'dark' },
      };

      const result = factory.createLoginResponse(mockAccessToken, extendedUser);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: extendedUser.id,
          name: extendedUser.name,
          email: extendedUser.email,
        },
      });
    });

    it('should handle user with minimal required fields', () => {
      const minimalUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = factory.createLoginResponse(mockAccessToken, minimalUser, 'detailed');

      expect(result).toEqual({
        access_token: mockAccessToken,
        refresh_token: null,
        user: {
          id: minimalUser.id,
          name: minimalUser.name,
          email: minimalUser.email,
          roles: [],
        },
        expires_in: 86400,
      });
    });

    it('should handle user with null or undefined optional fields', () => {
      const userWithNulls = {
        id: 1,
        email: 'test@example.com',
        name: null,
        roles: null,
      };

      const result = factory.createLoginResponse(mockAccessToken, userWithNulls);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: userWithNulls.id,
          name: userWithNulls.name,
          email: userWithNulls.email,
        },
      });
    });

    it('should handle user with zero or negative ID', () => {
      const edgeCaseUsers = [
        { id: 0, email: 'zero@example.com', name: 'Zero User' },
        { id: -1, email: 'negative@example.com', name: 'Negative User' },
      ];

      edgeCaseUsers.forEach(user => {
        const result = factory.createLoginResponse(mockAccessToken, user);
        expect(result).toEqual({
          access_token: mockAccessToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        });
      });
    });

    it('should handle user with string ID', () => {
      const userWithStringId = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = factory.createLoginResponse(mockAccessToken, userWithStringId);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: userWithStringId.id,
          name: userWithStringId.name,
          email: userWithStringId.email,
        },
      });
    });

    it('should handle user with very long email and name', () => {
      const userWithLongFields = {
        id: 1,
        email: 'a'.repeat(100) + '@example.com',
        name: 'a'.repeat(200),
      };

      const result = factory.createLoginResponse(mockAccessToken, userWithLongFields);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: userWithLongFields.id,
          name: userWithLongFields.name,
          email: userWithLongFields.email,
        },
      });
    });

    it('should handle user with special characters in email and name', () => {
      const userWithSpecialChars = {
        id: 1,
        email: 'test+special@example.com',
        name: 'Test User with spéciål chàracters',
      };

      const result = factory.createLoginResponse(mockAccessToken, userWithSpecialChars);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: userWithSpecialChars.id,
          name: userWithSpecialChars.name,
          email: userWithSpecialChars.email,
        },
      });
    });

    it('should handle user with empty email and name', () => {
      const userWithEmptyFields = {
        id: 1,
        email: '',
        name: '',
      };

      const result = factory.createLoginResponse(mockAccessToken, userWithEmptyFields);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: userWithEmptyFields.id,
          name: userWithEmptyFields.name,
          email: userWithEmptyFields.email,
        },
      });
    });

    it('should handle user with roles as array of strings', () => {
      const userWithStringRoles = {
        ...mockUser,
        roles: ['user', 'admin'],
      };

      const result = factory.createLoginResponse(mockAccessToken, userWithStringRoles, 'detailed');

      expect(result).toEqual({
        access_token: mockAccessToken,
        refresh_token: null,
        user: {
          id: userWithStringRoles.id,
          name: userWithStringRoles.name,
          email: userWithStringRoles.email,
          roles: ['user', 'admin'],
        },
        expires_in: 86400,
      });
    });

    it('should handle user with mixed role types', () => {
      const userWithMixedRoles = {
        ...mockUser,
        roles: [{ id: 1, name: 'user' }, 'admin'],
      };

      const result = factory.createLoginResponse(mockAccessToken, userWithMixedRoles, 'detailed');

      expect(result).toEqual({
        access_token: mockAccessToken,
        refresh_token: null,
        user: {
          id: userWithMixedRoles.id,
          name: userWithMixedRoles.name,
          email: userWithMixedRoles.email,
          roles: ['user', 'admin'],
        },
        expires_in: 86400,
      });
    });

    it('should handle empty access token', () => {
      const result = factory.createLoginResponse('', mockUser);

      expect(result).toEqual({
        access_token: '',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });
    });

    it('should handle null/undefined access token', () => {
      const testCases = [
        { token: null as any },
        { token: undefined as any },
      ];

      testCases.forEach(({ token }) => {
        const result = factory.createLoginResponse(token, mockUser);
        expect(result).toEqual({
          access_token: token,
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
          },
        });
      });
    });

    it('should throw error when user has no id', () => {
      const userWithoutId = {
        email: 'test@example.com',
        name: 'Test User',
      };

      expect(() => factory.createLoginResponse(mockAccessToken, userWithoutId as any)).toThrow(
        `No auth response strategy found for context: undefined`,
      );
    });

    it('should throw error when user is null', () => {
      expect(() => factory.createLoginResponse(mockAccessToken, null as any)).toThrow(
        `No auth response strategy found for context: undefined`,
      );
    });

    it('should throw error when user is undefined', () => {
      expect(() => factory.createLoginResponse(mockAccessToken, undefined as any)).toThrow(
        `No auth response strategy found for context: undefined`,
      );
    });
  });

  describe('strategy initialization', () => {
    it('should initialize with correct number of strategies', () => {
      const strategies = (factory as any).strategies;
      
      expect(strategies).toHaveLength(2);
      expect(strategies[0]).toBeInstanceOf(DetailedLoginResponseStrategy);
      expect(strategies[1]).toBeInstanceOf(LoginResponseStrategy);
    });

    it('should maintain strategy order (detailed first, then login)', () => {
      const strategies = (factory as any).strategies;
      
      expect(strategies[0]).toBeInstanceOf(DetailedLoginResponseStrategy);
      expect(strategies[1]).toBeInstanceOf(LoginResponseStrategy);
    });
  });
});