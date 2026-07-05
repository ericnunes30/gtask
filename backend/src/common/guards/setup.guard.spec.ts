import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';
import { SetupGuard } from './setup.guard';

describe('SetupGuard', () => {
  let guard: SetupGuard;
  let userRepository: { count: jest.Mock };

  beforeEach(() => {
    userRepository = { count: jest.fn() };
    guard = new SetupGuard(userRepository as unknown as Repository<User>);
  });

  it('should return true when no user exists (count = 0, setup mode)', async () => {
    userRepository.count.mockResolvedValue(0);
    const context = {} as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(userRepository.count).toHaveBeenCalledTimes(1);
  });

  it('should throw ForbiddenException when at least one user exists (count > 0)', async () => {
    userRepository.count.mockResolvedValue(3);
    const context = {} as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Setup completed. Registration is closed.',
    );
  });
});
