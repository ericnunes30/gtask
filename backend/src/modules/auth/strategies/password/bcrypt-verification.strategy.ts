import * as bcrypt from 'bcrypt';
import { PasswordVerificationStrategy } from './password-verification-strategy.interface';

export class BcryptVerificationStrategy implements PasswordVerificationStrategy {
  canHandle(hashedPassword: string): boolean {
    return !hashedPassword.startsWith('$scrypt$');
  }

  async verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      if (hashedPassword === plainPassword) {
        return true;
      }
      
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      return false;
    }
  }
}