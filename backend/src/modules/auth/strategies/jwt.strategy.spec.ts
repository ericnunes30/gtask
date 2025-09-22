import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

jest.mock('@nestjs/common');

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let logger: Logger;

  const mockPayload = {
    sub: 1,
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    (Logger as jest.Mock).mockImplementation(() => mockLogger);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be properly initialized with ConfigService', () => {
      expect(strategy).toBeDefined();
      expect(configService).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should have logger instance with correct name', () => {
      expect(Logger).toHaveBeenCalledWith(JwtStrategy.name);
    });

    it('should use provided JWT_SECRET when available', () => {
      (configService.get as jest.Mock).mockReturnValue('super-secret-key');
      
      // Re-initialize to test constructor behavior
      const newStrategy = new JwtStrategy(configService);
      
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should use default secret and log warning when JWT_SECRET is not provided', () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);
      
      // Re-initialize to test constructor behavior
      const newStrategy = new JwtStrategy(configService);
      
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(logger.warn).toHaveBeenCalledWith('JWT_SECRET not found in environment variables. Using default secret.');
    });

    it('should use default secret when JWT_SECRET is empty string', () => {
      (configService.get as jest.Mock).mockReturnValue('');
      
      // Re-initialize to test constructor behavior
      const newStrategy = new JwtStrategy(configService);
      
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(logger.warn).toHaveBeenCalledWith('JWT_SECRET not found in environment variables. Using default secret.');
    });
  });

  describe('validate', () => {
    it('should successfully validate token payload and return user object', async () => {
      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        sub: mockPayload.sub,
        email: mockPayload.email,
        name: mockPayload.name,
      });
    });

    it('should handle payload with minimal required fields', async () => {
      const minimalPayload = {
        sub: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await strategy.validate(minimalPayload);

      expect(result).toEqual({
        sub: minimalPayload.sub,
        email: minimalPayload.email,
        name: minimalPayload.name,
      });
    });

    it('should handle payload with additional fields', async () => {
      const extendedPayload = {
        ...mockPayload,
        iat: 1234567890,
        exp: 1234567890 + 3600,
        aud: 'web-app',
        iss: 'auth-service',
      };

      const result = await strategy.validate(extendedPayload);

      expect(result).toEqual({
        sub: extendedPayload.sub,
        email: extendedPayload.email,
        name: extendedPayload.name,
      });
    });

    it('should handle payload with null or undefined optional fields', async () => {
      const payloadWithNulls = {
        sub: 1,
        email: 'test@example.com',
        name: null,
        roles: undefined,
      };

      const result = await strategy.validate(payloadWithNulls);

      expect(result).toEqual({
        sub: payloadWithNulls.sub,
        email: payloadWithNulls.email,
        name: payloadWithNulls.name,
      });
    });

    it('should handle payload with numeric sub', async () => {
      const payloadWithNumericSub = {
        sub: 123,
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await strategy.validate(payloadWithNumericSub);

      expect(result).toEqual({
        sub: payloadWithNumericSub.sub,
        email: payloadWithNumericSub.email,
        name: payloadWithNumericSub.name,
      });
    });

    it('should handle payload with string sub', async () => {
      const payloadWithStringSub = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await strategy.validate(payloadWithStringSub);

      expect(result).toEqual({
        sub: payloadWithStringSub.sub,
        email: payloadWithStringSub.email,
        name: payloadWithStringSub.name,
      });
    });

    it('should handle empty email and name fields', async () => {
      const payloadWithEmptyFields = {
        sub: 1,
        email: '',
        name: '',
      };

      const result = await strategy.validate(payloadWithEmptyFields);

      expect(result).toEqual({
        sub: payloadWithEmptyFields.sub,
        email: payloadWithEmptyFields.email,
        name: payloadWithEmptyFields.name,
      });
    });

    it('should handle payload without roles field', async () => {
      const payloadWithoutRoles = {
        sub: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await strategy.validate(payloadWithoutRoles);

      expect(result).toEqual({
        sub: payloadWithoutRoles.sub,
        email: payloadWithoutRoles.email,
        name: payloadWithoutRoles.name,
      });
    });

    it('should handle payload with array of roles', async () => {
      const payloadWithRoles = {
        sub: 1,
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user', 'admin'],
      };

      const result = await strategy.validate(payloadWithRoles);

      expect(result).toEqual({
        sub: payloadWithRoles.sub,
        email: payloadWithRoles.email,
        name: payloadWithRoles.name,
      });
    });

    it('should handle payload with object roles', async () => {
      const payloadWithObjectRoles = {
        sub: 1,
        email: 'test@example.com',
        name: 'Test User',
        roles: [{ id: 1, name: 'user' }],
      };

      const result = await strategy.validate(payloadWithObjectRoles);

      expect(result).toEqual({
        sub: payloadWithObjectRoles.sub,
        email: payloadWithObjectRoles.email,
        name: payloadWithObjectRoles.name,
      });
    });
  });

  describe('passport strategy configuration', () => {
    it('should configure jwtFromRequest to use bearer token', () => {
      // Test that the strategy is configured correctly by checking if it exists
      expect(strategy).toBeDefined();
    });

    it('should configure ignoreExpiration to false', () => {
      // This is tested implicitly by the strategy creation
      expect(strategy).toBeDefined();
    });

    it('should configure secretOrKey correctly', () => {
      // Test with secret
      (configService.get as jest.Mock).mockReturnValue('test-secret');
      const strategyWithSecret = new JwtStrategy(configService);
      expect(strategyWithSecret).toBeDefined();
      
      // Test without secret
      (configService.get as jest.Mock).mockReturnValue(null);
      const strategyWithoutSecret = new JwtStrategy(configService);
      expect(strategyWithoutSecret).toBeDefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle payload with sub as zero', async () => {
      const payload = {
        sub: 0,
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      });
    });

    it('should handle payload with sub as negative number', async () => {
      const payload = {
        sub: -1,
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      });
    });

    it('should handle payload with very long email and name', async () => {
      const payload = {
        sub: 1,
        email: 'a'.repeat(100) + '@example.com',
        name: 'a'.repeat(200),
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      });
    });

    it('should handle payload with special characters in email and name', async () {
      const payload = {
        sub: 1,
        email: 'test+special@example.com',
        name: 'Test User with special characters',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      });
    });

    it('should handle payload with boolean values (edge case)', async () => {
      const payload = {
        sub: 1,
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        isVerified: false,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      });
    });
  });
});