import { Test, TestingModule } from '@nestjs/testing';
import { TokenPayloadFactory } from './token-payload.factory';
import { DefaultTokenPayloadStrategy } from './token-payload.factory';
import { ExtendedTokenPayloadStrategy } from './token-payload.factory';

describe('TokenPayloadFactory', () => {
  let factory: TokenPayloadFactory;
  let defaultStrategy: DefaultTokenPayloadStrategy;
  let extendedStrategy: ExtendedTokenPayloadStrategy;

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

  const mockUserWithUndefinedRoles = {
    id: 3,
    email: 'undefined-roles@example.com',
    name: 'Undefined Roles User',
    roles: undefined,
  };

  beforeEach(() => {
    defaultStrategy = new DefaultTokenPayloadStrategy();
    extendedStrategy = new ExtendedTokenPayloadStrategy();
    factory = new TokenPayloadFactory();
  });

  describe('constructor', () => {
    it('should be properly initialized with strategies', () => {
      expect(factory).toBeDefined();
    });
  });

  describe('createPayload', () => {
    it('should use ExtendedTokenPayloadStrategy when context is "extended"', () => {
      const result = factory.createPayload(mockUser, 'extended');

      expect(result).toEqual({
        email: mockUser.email,
        sub: mockUser.id,
        name: mockUser.name,
        roles: ['user', 'admin'],
      });
    });

    it('should use DefaultTokenPayloadStrategy when no context is provided', () => {
      const result = factory.createPayload(mockUser);

      expect(result).toEqual({
        email: mockUser.email,
        sub: mockUser.id,
        name: mockUser.name,
      });
    });

    it('should use DefaultTokenPayloadStrategy when context is empty string', () => {
      const result = factory.createPayload(mockUser, '');

      expect(result).toEqual({
        email: mockUser.email,
        sub: mockUser.id,
        name: mockUser.name,
      });
    });

    it('should use DefaultTokenPayloadStrategy when context is "default"', () => {
      const result = factory.createPayload(mockUser, 'default');

      expect(result).toEqual({
        email: mockUser.email,
        sub: mockUser.id,
        name: mockUser.name,
      });
    });

    it('should handle user without roles in extended context', () => {
      const result = factory.createPayload(mockUserWithoutRoles, 'extended');

      expect(result).toEqual({
        email: mockUserWithoutRoles.email,
        sub: mockUserWithoutRoles.id,
        name: mockUserWithoutRoles.name,
        roles: [],
      });
    });

    it('should handle user with undefined roles in extended context', () => {
      const result = factory.createPayload(mockUserWithUndefinedRoles, 'extended');

      expect(result).toEqual({
        email: mockUserWithUndefinedRoles.email,
        sub: mockUserWithUndefinedRoles.id,
        name: mockUserWithUndefinedRoles.name,
        roles: [],
      });
    });

    it('should throw error when no strategy can handle the context', () => {
      expect(() => factory.createPayload(mockUser, 'invalid-context')).toThrow(
        `No token payload strategy found for user: ${mockUser.id}`,
      );
    });

    it('should handle user with minimal required fields', () => {
      const minimalUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = factory.createPayload(minimalUser, 'extended');

      expect(result).toEqual({
        email: minimalUser.email,
        sub: minimalUser.id,
        name: minimalUser.name,
        roles: [],
      });
    });

    it('should handle user with additional fields', () => {
      const extendedUser = {
        ...mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        preferences: { theme: 'dark' },
      };

      const result = factory.createPayload(extendedUser);

      expect(result).toEqual({
        email: extendedUser.email,
        sub: extendedUser.id,
        name: extendedUser.name,
      });
    });

    it('should handle user with null or undefined optional fields', () => {
      const userWithNulls = {
        id: 1,
        email: 'test@example.com',
        name: null,
        roles: null,
      };

      const result = factory.createPayload(userWithNulls);

      expect(result).toEqual({
        email: userWithNulls.email,
        sub: userWithNulls.id,
        name: userWithNulls.name,
      });
    });

    it('should handle user with zero or negative ID', () => {
      const edgeCaseUsers = [
        { id: 0, email: 'zero@example.com', name: 'Zero User' },
        { id: -1, email: 'negative@example.com', name: 'Negative User' },
      ];

      edgeCaseUsers.forEach(user => {
        const result = factory.createPayload(user);
        expect(result).toEqual({
          email: user.email,
          sub: user.id,
          name: user.name,
        });
      });
    });

    it('should handle user with string ID', () => {
      const userWithStringId = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = factory.createPayload(userWithStringId);

      expect(result).toEqual({
        email: userWithStringId.email,
        sub: userWithStringId.id,
        name: userWithStringId.name,
      });
    });

    it('should handle user with very long email and name', () => {
      const userWithLongFields = {
        id: 1,
        email: 'a'.repeat(100) + '@example.com',
        name: 'a'.repeat(200),
      };

      const result = factory.createPayload(userWithLongFields);

      expect(result).toEqual({
        email: userWithLongFields.email,
        sub: userWithLongFields.id,
        name: userWithLongFields.name,
      });
    });

    it('should handle user with special characters in email and name', () => {
      const userWithSpecialChars = {
        id: 1,
        email: 'test+special@example.com',
        name: 'Test User with spéciål chàracters',
      };

      const result = factory.createPayload(userWithSpecialChars);

      expect(result).toEqual({
        email: userWithSpecialChars.email,
        sub: userWithSpecialChars.id,
        name: userWithSpecialChars.name,
      });
    });

    it('should handle user with empty email and name', () => {
      const userWithEmptyFields = {
        id: 1,
        email: '',
        name: '',
      };

      const result = factory.createPayload(userWithEmptyFields);

      expect(result).toEqual({
        email: userWithEmptyFields.email,
        sub: userWithEmptyFields.id,
        name: userWithEmptyFields.name,
      });
    });

    it('should handle user with roles as array of strings', () => {
      const userWithStringRoles = {
        ...mockUser,
        roles: ['user', 'admin'],
      };

      const result = factory.createPayload(userWithStringRoles, 'extended');

      expect(result).toEqual({
        email: userWithStringRoles.email,
        sub: userWithStringRoles.id,
        name: userWithStringRoles.name,
        roles: ['user', 'admin'],
      });
    });

    it('should handle user with mixed role types', () => {
      const userWithMixedRoles = {
        ...mockUser,
        roles: [{ id: 1, name: 'user' }, 'admin'],
      };

      const result = factory.createPayload(userWithMixedRoles, 'extended');

      expect(result).toEqual({
        email: userWithMixedRoles.email,
        sub: userWithMixedRoles.id,
        name: userWithMixedRoles.name,
        roles: ['user', 'admin'],
      });
    });

    it('should throw error when user has no id', () => {
      const userWithoutId = {
        email: 'test@example.com',
        name: 'Test User',
      };

      expect(() => factory.createPayload(userWithoutId as any)).toThrow(
        `No token payload strategy found for user: undefined`,
      );
    });

    it('should throw error when user is null', () => {
      expect(() => factory.createPayload(null as any)).toThrow(
        `No token payload strategy found for user: null`,
      );
    });

    it('should throw error when user is undefined', () => {
      expect(() => factory.createPayload(undefined as any)).toThrow(
        `No token payload strategy found for user: undefined`,
      );
    });
  });

  describe('strategy initialization', () => {
    it('should initialize with correct number of strategies', () => {
      const strategies = (factory as any).strategies;
      
      expect(strategies).toHaveLength(2);
      expect(strategies[0]).toBeInstanceOf(ExtendedTokenPayloadStrategy);
      expect(strategies[1]).toBeInstanceOf(DefaultTokenPayloadStrategy);
    });

    it('should maintain strategy order (extended first, then default)', () => {
      const strategies = (factory as any).strategies;
      
      expect(strategies[0]).toBeInstanceOf(ExtendedTokenPayloadStrategy);
      expect(strategies[1]).toBeInstanceOf(DefaultTokenPayloadStrategy);
    });
  });
});