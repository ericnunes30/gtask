import { ScryptVerificationStrategy } from './scrypt-verification.strategy';
import * as scrypt from 'scrypt-js';
import * as crypto from 'crypto';

jest.mock('scrypt-js');
jest.mock('crypto');

describe('ScryptVerificationStrategy', () => {
  let strategy: ScryptVerificationStrategy;

  beforeEach(() => {
    strategy = new ScryptVerificationStrategy();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return true for scrypt password hashes', () => {
      const scryptHash = '$scrypt$ln=10,r=8,p=1$c2FsdA==$hash';
      expect(strategy.canHandle(scryptHash)).toBe(true);
    });

    it('should return false for non-scrypt password hashes', () => {
      const bcryptHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';
      expect(strategy.canHandle(bcryptHash)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(strategy.canHandle('')).toBe(false);
    });

    it('should return false for plain text passwords', () => {
      expect(strategy.canHandle('plainpassword')).toBe(false);
    });

    it('should return false for malformed hashes', () => {
      const malformedHashes = [
        '$scrypt',
        '$scrypt$',
        '$scrypt$invalid',
        'plaintext',
      ];

      malformedHashes.forEach(hash => {
        expect(strategy.canHandle(hash)).toBe(false);
      });

      // Test null and undefined separately since they cause errors
      expect(() => strategy.canHandle(null as any)).toThrow();
      expect(() => strategy.canHandle(undefined as any)).toThrow();
    });
  });

  describe('verify', () => {
    it('should return false for malformed scrypt hash format', async () => {
      const plainPassword = 'password123';
      const malformedHashes = [
        '$scrypt$',
        '$scrypt$invalid',
        'not-scrypt',
        '$scrypt$ln=10,r=8,p=1$incomplete',
      ];

      for (const hashedPassword of malformedHashes) {
        const result = await strategy.verify(plainPassword, hashedPassword);
        expect(result).toBe(false);
      }
    });

    it('should return false when hash does not have exactly 5 parts', async () => {
      const plainPassword = 'password123';
      const invalidHash = '$scrypt$ln=10,r=8,p=1$salt$hash$extra';

      const result = await strategy.verify(plainPassword, invalidHash);
      expect(result).toBe(false);
    });

    it('should return false when second part is not "scrypt"', async () => {
      const plainPassword = 'password123';
      const invalidHash = '$bcrypt$ln=10,r=8,p=1$c2FsdA==$hash';

      const result = await strategy.verify(plainPassword, invalidHash);
      expect(result).toBe(false);
    });

    it('should successfully verify correct password', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$scrypt$ln=16384,r=8,p=1$c2FsdA==$expectedHash';
      
      const mockDerivedKey = Buffer.from('derivedKey');
      const mockSalt = Buffer.from('salt');
      const mockExpectedHash = Buffer.from('expectedHash');

      (scrypt.scrypt as jest.Mock).mockResolvedValue(mockDerivedKey);
      (Buffer.from as jest.Mock)
        .mockReturnValueOnce(mockSalt)
        .mockReturnValueOnce(mockExpectedHash);
      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(scrypt.scrypt).toHaveBeenCalledWith(
        Buffer.from(plainPassword, 'utf8'),
        mockSalt,
        16384,
        8,
        1,
        mockExpectedHash.length
      );
      expect(crypto.timingSafeEqual).toHaveBeenCalledWith(mockExpectedHash, Buffer.from(mockDerivedKey));
      expect(result).toBe(true);
    });

    it('should return false when password does not match', async () => {
      const plainPassword = 'wrongpassword';
      const hashedPassword = '$scrypt$ln=16384,r=8,p=1$c2FsdA==$expectedHash';
      
      const mockDerivedKey = Buffer.from('derivedKey');
      const mockSalt = Buffer.from('salt');
      const mockExpectedHash = Buffer.from('expectedHash');

      (scrypt.scrypt as jest.Mock).mockResolvedValue(mockDerivedKey);
      (Buffer.from as jest.Mock)
        .mockReturnValueOnce(mockSalt)
        .mockReturnValueOnce(mockExpectedHash);
      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(false);

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(crypto.timingSafeEqual).toHaveBeenCalledWith(mockExpectedHash, Buffer.from(mockDerivedKey));
      expect(result).toBe(false);
    });

    it('should handle invalid parameter parsing', async () => {
      const plainPassword = 'password123';
      const invalidParamHashes = [
        '$scrypt$invalid=,r=8,p=1$c2FsdA==$hash',
        '$scrypt$ln=invalid,r=8,p=1$c2FsdA==$hash',
        '$scrypt$ln=10,invalid=,p=1$c2FsdA==$hash',
        '$scrypt$ln=10,r=8,invalid=$c2FsdA==$hash',
      ];

      for (const hashedPassword of invalidParamHashes) {
        const result = await strategy.verify(plainPassword, hashedPassword);
        expect(result).toBe(false);
      }
    });

    it('should handle scrypt.scrypt errors', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$scrypt$ln=16384,r=8,p=1$c2FsdA==$expectedHash';
      
      const mockSalt = Buffer.from('salt');
      const mockExpectedHash = Buffer.from('expectedHash');

      (scrypt.scrypt as jest.Mock).mockRejectedValue(new Error('Scrypt error'));
      (Buffer.from as jest.Mock)
        .mockReturnValueOnce(mockSalt)
        .mockReturnValueOnce(mockExpectedHash);

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle Buffer.from errors', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$scrypt$ln=16384,r=8,p=1$c2FsdA==$expectedHash';

      (Buffer.from as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle crypto.timingSafeEqual errors', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$scrypt$ln=16384,r=8,p=1$c2FsdA==$expectedHash';
      
      const mockDerivedKey = Buffer.from('derivedKey');
      const mockSalt = Buffer.from('salt');
      const mockExpectedHash = Buffer.from('expectedHash');

      (scrypt.scrypt as jest.Mock).mockResolvedValue(mockDerivedKey);
      (Buffer.from as jest.Mock)
        .mockReturnValueOnce(mockSalt)
        .mockReturnValueOnce(mockExpectedHash);
      (crypto.timingSafeEqual as jest.Mock).mockImplementation(() => {
        throw new Error('Timing safe equal error');
      });

      const result = await strategy.verify(plainPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle different parameter values correctly', async () => {
      const testCases = [
        { hash: '$scrypt$ln=1024,r=4,p=2$c2FsdA==$hash', n: 1024, r: 4, p: 2 },
        { hash: '$scrypt$ln=32768,r=16,p=4$c2FsdA==$hash', n: 32768, r: 16, p: 4 },
        { hash: '$scrypt$ln=8192,r=12,p=3$c2FsdA==$hash', n: 8192, r: 12, p: 3 },
      ];

      const plainPassword = 'password123';
      
      for (const testCase of testCases) {
        const mockDerivedKey = Buffer.from('derivedKey');
        const mockSalt = Buffer.from('salt');
        const mockExpectedHash = Buffer.from('hash');

        (scrypt.scrypt as jest.Mock).mockResolvedValue(mockDerivedKey);
        (Buffer.from as jest.Mock)
          .mockReturnValueOnce(mockSalt)
          .mockReturnValueOnce(mockExpectedHash);
        (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

        const result = await strategy.verify(plainPassword, testCase.hash);

        expect(scrypt.scrypt).toHaveBeenCalledWith(
          Buffer.from(plainPassword, 'utf8'),
          mockSalt,
          testCase.n,
          testCase.r,
          testCase.p,
          mockExpectedHash.length
        );
        expect(result).toBe(true);
        
        jest.clearAllMocks();
      }
    });

    it('should handle case where parameters are at boundaries', async () => {
      const boundaryCases = [
        { hash: '$scrypt$ln=1,r=1,p=1$c2FsdA==$hash', n: 1, r: 1, p: 1 },
        { hash: '$scrypt$ln=999999,r=999,p=999$c2FsdA==$hash', n: 999999, r: 999, p: 999 },
      ];

      const plainPassword = 'password123';
      
      for (const testCase of boundaryCases) {
        const mockDerivedKey = Buffer.from('derivedKey');
        const mockSalt = Buffer.from('salt');
        const mockExpectedHash = Buffer.from('hash');

        (scrypt.scrypt as jest.Mock).mockResolvedValue(mockDerivedKey);
        (Buffer.from as jest.Mock)
          .mockReturnValueOnce(mockSalt)
          .mockReturnValueOnce(mockExpectedHash);
        (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

        const result = await strategy.verify(plainPassword, testCase.hash);

        expect(scrypt.scrypt).toHaveBeenCalledWith(
          Buffer.from(plainPassword, 'utf8'),
          mockSalt,
          testCase.n,
          testCase.r,
          testCase.p,
          mockExpectedHash.length
        );
        expect(result).toBe(true);
        
        jest.clearAllMocks();
      }
    });

    it('should handle null/undefined inputs gracefully', async () => {
      const testCases = [
        { plain: null as any, hashed: '$scrypt$ln=10,r=8,p=1$c2FsdA==$hash' },
        { plain: undefined as any, hashed: '$scrypt$ln=10,r=8,p=1$c2FsdA==$hash' },
        { plain: 'password123', hashed: null as any },
        { plain: 'password123', hashed: undefined as any },
      ];

      for (const testCase of testCases) {
        const result = await strategy.verify(testCase.plain, testCase.hashed);
        expect(result).toBe(false);
      }
    });

    it('should handle empty string inputs', async () => {
      const testCases = [
        { plain: '', hashed: '$scrypt$ln=10,r=8,p=1$c2FsdA==$hash' },
        { plain: 'password123', hashed: '' },
        { plain: '', hashed: '' },
      ];

      for (const testCase of testCases) {
        const result = await strategy.verify(testCase.plain, testCase.hashed);
        expect(result).toBe(false);
      }
    });
  });
});