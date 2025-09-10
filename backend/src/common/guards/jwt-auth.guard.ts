import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
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
      this.logger.error(`Authentication Error: ${info?.message || 'No user found'}`, err?.stack);
      throw err || new Error('Unauthorized');
    }
    this.logger.log(`User authenticated: ${user.username}`);
    return user;
  }
}