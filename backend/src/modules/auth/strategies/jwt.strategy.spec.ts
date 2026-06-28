import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const configService: { get: jest.Mock } = {
    get: jest.fn(),
  };

  beforeEach(() => {
    configService.get.mockReturnValue('test-secret');
    strategy = new JwtStrategy(configService as unknown as ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
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
  });
});
