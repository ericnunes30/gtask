import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { SetupDto } from '../dto/setup.dto';
import { TokenPayloadFactory } from '../factories/token-payload.factory';
import { AuthResponseFactory } from '../factories/auth-response.factory';
import { UserValidationFactory } from '../factories/user-validation.factory';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private tokenPayloadFactory: TokenPayloadFactory,
    private authResponseFactory: AuthResponseFactory,
    private userValidationFactory: UserValidationFactory,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    return await this.userValidationFactory.validateUser(email, password);
  }

  async checkSetupStatus(): Promise<{ needsSetup: boolean }> {
    const count = await this.userService.count();
    return { needsSetup: count === 0 };
  }

  async setupFirstUser(setupDto: SetupDto) {
    const count = await this.userService.count();
    if (count > 0) {
      throw new ForbiddenException('Setup already completed. Please login.');
    }

    const user = await this.userService.createFirstAdmin(setupDto);

    const accessTokenPayload = this.tokenPayloadFactory.createPayload(
      user,
      'extended',
    );
    const refreshTokenPayload = { sub: user.id };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: '7d',
    });

    this.logger.log(`Setup completed for first admin user: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessTokenPayload = this.tokenPayloadFactory.createPayload(
      user,
      'extended',
    );
    const refreshTokenPayload = { sub: user.id }; // Minimal payload for refresh token

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: '7d',
    });

    this.logger.log(
      `Successfully created access and refresh tokens for user ${user.email}`,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid user');
      }

      const newAccessTokenPayload = this.tokenPayloadFactory.createPayload(
        user,
        'extended',
      );
      const newAccessToken = this.jwtService.sign(newAccessTokenPayload, {
        expiresIn: '15m',
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    return user;
  }

  verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
