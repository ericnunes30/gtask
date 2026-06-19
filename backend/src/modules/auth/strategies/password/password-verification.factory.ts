import { Injectable } from '@nestjs/common';
import { PasswordVerificationStrategy } from './password-verification-strategy.interface';
import { ScryptVerificationStrategy } from './scrypt-verification.strategy';
import { BcryptVerificationStrategy } from './bcrypt-verification.strategy';

@Injectable()
export class PasswordVerificationFactory {
  private readonly strategies: PasswordVerificationStrategy[];

  constructor() {
    this.strategies = [
      new ScryptVerificationStrategy(),
      new BcryptVerificationStrategy(),
    ];
  }

  getStrategy(hashedPassword: string): PasswordVerificationStrategy {
    const strategy = this.strategies.find((s) => s.canHandle(hashedPassword));

    if (!strategy) {
      throw new Error(
        `No password verification strategy found for hash: ${hashedPassword.substring(0, 10)}...`,
      );
    }

    return strategy;
  }
}
