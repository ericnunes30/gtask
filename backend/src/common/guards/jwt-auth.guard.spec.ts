import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let parentCanActivate: jest.SpyInstance;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    parentCanActivate = jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    parentCanActivate.mockRestore();
  });

  describe('canActivate', () => {
    it('should delegate to super.canActivate and forward the context', () => {
      const context = {} as ExecutionContext;

      const result = guard.canActivate(context);

      expect(parentCanActivate).toHaveBeenCalledWith(context);
      expect(result).toBe(true);
    });
  });

  describe('handleRequest', () => {
    it('should rethrow the original error when err is an Error', () => {
      const error = new Error('passport failure');

      expect(() =>
        guard.handleRequest(error, false, undefined, {} as ExecutionContext),
      ).toThrow('passport failure');
    });

    it('should throw UnauthorizedException when user is false and info is undefined', () => {
      expect(() =>
        guard.handleRequest(
          undefined,
          false,
          undefined,
          {} as ExecutionContext,
        ),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with info message when info is a string', () => {
      expect(() =>
        guard.handleRequest(
          undefined,
          false,
          'missing token',
          {} as ExecutionContext,
        ),
      ).toThrow('missing token');
    });

    it('should throw UnauthorizedException with "Unauthorized" when info is neither Error nor string', () => {
      expect(() =>
        guard.handleRequest(undefined, false, 42, {} as ExecutionContext),
      ).toThrow('Unauthorized');
    });

    it('should return the user when err is null and user is valid', () => {
      const user = {
        sub: 1,
        username: 'alice',
        email: 'alice@example.com',
      } as Express.User;

      const result = guard.handleRequest<Express.User>(
        null,
        user,
        undefined,
        {} as ExecutionContext,
      );

      expect(result).toBe(user);
    });
  });
});
