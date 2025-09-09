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
    this.logger.log(`JwtAuthGuard: handleRequest called. User: ${JSON.stringify(user)}, Error: ${JSON.stringify(err)}, Info: ${JSON.stringify(info)}`);
    // You can throw an exception based on error or user status
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}