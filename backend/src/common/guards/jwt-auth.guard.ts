import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    this.logger.log('JwtAuthGuard: canActivate called');
    // Add your custom authentication logic here
    // For example, you can call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      const message = info?.message || 'Unauthorized';
      this.logger.error(`Authentication Error: ${message}`, err?.stack);
      throw err || new UnauthorizedException(message);
    }
    const label = user?.username || user?.email || user?.sub || 'unknown';
    this.logger.log(`User authenticated: ${label}`);
    return user;
  }
}
