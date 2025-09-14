import { BcryptVerificationStrategy } from './bcrypt-verification.strategy';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('BcryptVerificationStrategy', () => {
  let strategy: BcryptVerificationStrategy;

  beforeEach(() => {
    strategy = new BcryptVerificationStrategy();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return true for non-scrypt password hashes', () => {
      const bcryptHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';
      expect(strategy.canHandle(bcryptHash)).toBe(true);
    });

    it('should return false for scrypt password hashes', () => {
      const scryptHash = '$scrypt$ln=10,r=8,p=1$c2FsdA==$hash';
      expect(strategy.canHandle(scryptHash)).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(strategy.canHandle('')).toBe(true);
    });

    it('should return true for plain text passwords', () => {
      expect(strategy.canHandle('plainpassword')).toBe(true);
    });

    it('should return true for malformed hashes that do not start with $scrypt$', () => {
      const malformedHashes = [
        '$2a$10$invalid',
        '$sha256$hash',
        'plaintext',
        null as any,
        undefined as any,
      ];

      malformedHashes.forEach(hash => {
        expect(strategy.canHandle(hash)).toBe(true);
      });
    });
  });

  describe('verify', () => {
    it('should return true when passwords match exactly', async () => {
      const plainPassword = 'password123';
      const hashedPassword = 'password123';

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should call bcrypt.compare when passwords do not match exactly', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false when bcrypt.compare returns false', async () => {
      const plainPassword = 'wrongpassword';
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should return false when bcrypt.compare throws an error', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should handle bcrypt.compare throwing specific error types', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      const errors = [
        new Error('data and hash arguments required'),
        new Error('illegal arguments: undefined'),
        new Error('invalid salt'),
      ];

      for (const error of errors) {
        (bcrypt.compare as jest.Mock).mockRejectedValue(error);

        const result = await strategy.verify(plainPassword, hashedPassword);

        expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
        expect(result).toBe(false);
      }
    });

    it('should handle case where plain password is null or undefined', async () => {
      const testCases = [
        { plain: null as any, hashed: 'password123' },
        { plain: undefined as any, hashed: 'password123' },
        { plain: '', hashed: 'password123' },
      ];

      for (const testCase of testCases) {
        const result = await strategy.verify(testCase.plain, testCase.hashed);
        expect(result).toBe(testCase.plain === testCase.hashed);
      }
    });

    it('should handle case where hashed password is null or undefined', async () => {
      const plainPassword = 'password123';

      const testCases = [null as any, undefined as any, ''];

      for (const hashedPassword of testCases) {
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await strategy.verify(plainPassword, hashedPassword);

        if (hashedPassword === plainPassword) {
          expect(result).toBe(true);
          expect(bcrypt.compare).not.toHaveBeenCalled();
        } else {
          expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
          expect(result).toBe(false);
        }
      }
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await strategy.verify(longPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(longPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = 'p@ssw0rd!@#$%^&*()_+-={}[]|:";\'<>?,./`~';
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await strategy.verify(specialPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(specialPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = 'пароль123';
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await strategy.verify(unicodePassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(unicodePassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should handle whitespace in passwords', async () => {
      const whitespacePassword = '  password 123  ';
      const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await strategy.verify(whitespacePassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(whitespacePassword, hashedPassword);
      expect(result).toBe(true);
    });
  });
});