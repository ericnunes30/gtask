import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    this.logger.log('JwtAuthGuard: canActivate called');
    return super.canActivate(context);
  }

  // Sobrescrita do handleRequest do Passport com tipagem estrita (sem any).
  // A assinatura base (AuthGuard) usa any, mas a sobrescrita com unknown
  // e generic é compativel via bivariancia / structural typing.
  handleRequest<TUser extends Express.User = Express.User>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err || !user) {
      const infoMessage =
        info instanceof Error
          ? info.message
          : typeof info === 'string'
            ? info
            : 'Unauthorized';
      const errStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Authentication Error: ${infoMessage}`, errStack);
      throw err instanceof Error ? err : new UnauthorizedException(infoMessage);
    }
    const label = user.username || user.email || String(user.sub) || 'unknown';
    this.logger.log(`User authenticated: ${label}`);
    return user;
  }
}
