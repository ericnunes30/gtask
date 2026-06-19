import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserModule } from '../user/user.module';
import { PasswordVerificationFactory } from './strategies/password/password-verification.factory';
import { TokenPayloadFactory } from './factories/token-payload.factory';
import { AuthResponseFactory } from './factories/auth-response.factory';
import { UserValidationFactory } from './factories/user-validation.factory';

import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    CommonModule,
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    PasswordVerificationFactory,
    TokenPayloadFactory,
    AuthResponseFactory,
    UserValidationFactory,
  ],
  exports: [AuthService],
})
export class AuthModule {}
