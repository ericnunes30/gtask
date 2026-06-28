import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../services/auth.service';
import type { UserWithRoles } from '../interfaces/user-with-roles.interface';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  const authService: { validateUser: jest.Mock } = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService.validateUser.mockClear();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return the user when credentials are valid', async () => {
      const user: UserWithRoles = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        roles: [{ name: 'ADMIN' }],
      };
      authService.validateUser.mockResolvedValue(user);

      const result = await strategy.validate('user@example.com', 'password');

      expect(result).toEqual(user);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'user@example.com',
        'password',
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('user@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
