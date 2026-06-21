import * as scrypt from 'scrypt-js';
import * as crypto from 'crypto';
import { PasswordVerificationStrategy } from './password-verification-strategy.interface';

export class ScryptVerificationStrategy
  implements PasswordVerificationStrategy
{
  canHandle(hashedPassword: string): boolean {
    return hashedPassword.startsWith('$scrypt$');
  }

  async verify(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      const parts = hashedPassword.split('$');
      if (parts.length !== 5 || parts[1] !== 'scrypt') {
        return false;
      }

      const params = parts[2].split(',');
      const n = parseInt(params[0].split('=')[1]);
      const r = parseInt(params[1].split('=')[1]);
      const p = parseInt(params[2].split('=')[1]);

      const salt = Buffer.from(parts[3], 'base64');
      const expectedHash = Buffer.from(parts[4], 'base64');

      const derivedKey = await scrypt.scrypt(
        Buffer.from(plainPassword, 'utf8'),
        salt,
        n,
        r,
        p,
        expectedHash.length,
      );

      return crypto.timingSafeEqual(expectedHash, Buffer.from(derivedKey));
    } catch {
      return false;
    }
  }
}
