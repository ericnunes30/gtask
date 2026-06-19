import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'your-secret-key',
    });

    if (!secret) {
      this.logger.warn('JWT_SECRET not found in environment variables. Using default secret.');
    }
  }

  async validate(payload: any) {
    // Corrigido para retornar o payload com a propriedade `sub` que a aplicação espera
    return { 
      sub: payload.sub, 
      email: payload.email,
      name: payload.name 
    };
  }
}