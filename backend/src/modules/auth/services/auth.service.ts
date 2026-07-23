import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { SetupDto } from '../dto/setup.dto';
import { UserWithRoles } from '../interfaces/user-with-roles.interface';
import { PasswordVerificationFactory } from '../strategies/password/password-verification.factory';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshSecret: string;

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private passwordFactory: PasswordVerificationFactory,
    private configService: ConfigService,
  ) {
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.get<string>('JWT_SECRET') ??
      'your-secret-key';
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserWithRoles | null> {
    const user = await this.userService.findByEmail(email);
    if (
      user &&
      user.password &&
      (await this.verifyPassword(password, user.password))
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars
      const { password: _password, ...result } = user;
      return result as unknown as UserWithRoles;
    }
    return null;
  }

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      const strategy = this.passwordFactory.getStrategy(hashedPassword);
      return await strategy.verify(plainPassword, hashedPassword);
    } catch {
      return false;
    }
  }

  private buildTokenPayload(user: UserWithRoles): Record<string, unknown> {
    return {
      email: user.email,
      sub: user.id,
      name: user.name,
      roles: user.roles?.map((role) => role.name) ?? [],
    };
  }

  async checkSetupStatus(): Promise<{ needsSetup: boolean }> {
    const count = await this.userService.count();
    return { needsSetup: count === 0 };
  }

  private generateTokens(user: UserWithRoles): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessTokenPayload = this.buildTokenPayload(user);
    const refreshTokenPayload = { sub: user.id };

    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: accessExpiresIn,
    });
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  async setupFirstUser(setupDto: SetupDto) {
    const count = await this.userService.count();
    if (count > 0) {
      throw new ForbiddenException('Setup already completed. Please login.');
    }

    const user = await this.userService.createFirstAdmin(setupDto);
    const { accessToken, refreshToken } = this.generateTokens(
      user as UserWithRoles,
    );

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

    const { accessToken, refreshToken } = this.generateTokens(user);

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
      const payload = this.jwtService.verify<{ sub: number }>(token, {
        secret: this.refreshSecret,
      });
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid user');
      }

      const newAccessTokenPayload = this.buildTokenPayload(
        user as UserWithRoles,
      );
      const newAccessToken = this.jwtService.sign(newAccessTokenPayload, {
        expiresIn:
          this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      });
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.refreshSecret,
          expiresIn:
            this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
        },
      );

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    return user;
  }

  verifyToken(token: string): { sub: number; email: string; name: string } {
    try {
      return this.jwtService.verify<{
        sub: number;
        email: string;
        name: string;
      }>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
