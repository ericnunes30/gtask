import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserModule } from '../user/user.module';
import { PasswordVerificationFactory } from './strategies/password/password-verification.factory';

import { CommonModule } from '../../common/common.module';
import { JwtConfigModule } from '../../config/jwt-module.config';

@Module({
  imports: [
    CommonModule,
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    PasswordVerificationFactory,
  ],
  exports: [AuthService],
})
export class AuthModule {}
