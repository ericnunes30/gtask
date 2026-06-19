import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import { PasswordVerificationFactory } from '../strategies/password/password-verification.factory';

export interface UserValidationStrategy {
  canHandle(email: string, password: string): boolean;
  validate(email: string, password: string): Promise<any>;
}

@Injectable()
export class StandardUserValidationStrategy implements UserValidationStrategy {
  constructor(
    private userService: UserService,
    private passwordFactory: PasswordVerificationFactory,
  ) {}

  canHandle(): boolean {
    return true; // fallback strategy
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && user.password && await this.verifyPassword(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  private async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      const strategy = this.passwordFactory.getStrategy(hashedPassword);
      return await strategy.verify(plainPassword, hashedPassword);
    } catch (error) {
      return false;
    }
  }
}

@Injectable()
export class UserValidationFactory {
  private readonly strategies: UserValidationStrategy[];

  constructor(
    private userService: UserService,
    private passwordFactory: PasswordVerificationFactory,
  ) {
    this.strategies = [
      new StandardUserValidationStrategy(userService, passwordFactory),
    ];
  }

  async validateUser(email: string, password: string): Promise<any> {
    const strategy = this.strategies.find(s => s.canHandle(email, password));
    
    if (!strategy) {
      throw new Error(`No user validation strategy found for email: ${email}`);
    }
    
    return await strategy.validate(email, password);
  }
}