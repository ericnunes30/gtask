import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

export const JwtConfigModule = JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    signOptions: { expiresIn: '15m' },
  }),
  inject: [ConfigService],
});
