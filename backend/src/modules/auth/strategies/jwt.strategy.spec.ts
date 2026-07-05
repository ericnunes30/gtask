import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = { get: jest.fn() };
    configService.get.mockReturnValue('test-secret');
    strategy = new JwtStrategy(configService as unknown as ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should warn and use default secret when JWT_SECRET is undefined', () => {
    const undefinedConfig: { get: jest.Mock } = { get: jest.fn() };
    undefinedConfig.get.mockReturnValue(undefined);

    const newStrategy = new JwtStrategy(
      undefinedConfig as unknown as ConfigService,
    );

    expect(newStrategy).toBeDefined();
    expect(undefinedConfig.get).toHaveBeenCalledWith('JWT_SECRET');
  });

  describe('validate', () => {
    it('should return the payload sub, email and name', () => {
      const payload = { sub: 1, email: 'user@example.com', name: 'User' };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        sub: 1,
        email: 'user@example.com',
        name: 'User',
      });
    });

    it('should return undefined sub when payload has no sub', () => {
      const payload = { email: 'user@example.com', name: 'User' } as {
        sub: number;
        email: string;
        name: string;
      };

      const result = strategy.validate(payload);

      expect(result.sub).toBeUndefined();
      expect(result.email).toBe('user@example.com');
    });

    it('should return undefined email and name when payload has no user fields', () => {
      const payload = { sub: 1 } as {
        sub: number;
        email: string;
        name: string;
      };

      const result = strategy.validate(payload);

      expect(result.sub).toBe(1);
      expect(result.email).toBeUndefined();
      expect(result.name).toBeUndefined();
    });
  });
});
