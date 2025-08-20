import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { TokenPayloadFactory } from '../factories/token-payload.factory';
import { AuthResponseFactory } from '../factories/auth-response.factory';
import { UserValidationFactory } from '../factories/user-validation.factory';

@Injectable()
export class AuthService {
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


  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = this.tokenPayloadFactory.createPayload(user);
    const accessToken = this.jwtService.sign(payload);
    
    return this.authResponseFactory.createLoginResponse(accessToken, user);
  }

  async register(registerDto: RegisterDto) {
    // Delegate creation to UserService and let mocks handle hashing/returned shape
    const user = await this.userService.create(registerDto);
    return user;
  }

  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}