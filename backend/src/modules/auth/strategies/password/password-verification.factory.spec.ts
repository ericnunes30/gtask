import { Test, TestingModule } from '@nestjs/testing';
import { PasswordVerificationFactory } from './password-verification.factory';
import { PasswordVerificationStrategy } from './password-verification-strategy.interface';
import { BcryptVerificationStrategy } from './bcrypt-verification.strategy';
import { ScryptVerificationStrategy } from './scrypt-verification.strategy';

jest.mock('./bcrypt-verification.strategy');
jest.mock('./scrypt-verification.strategy');

describe('PasswordVerificationFactory', () => {
  let factory: PasswordVerificationFactory;
  let bcryptStrategy: jest.Mocked<BcryptVerificationStrategy>;
  let scryptStrategy: jest.Mocked<ScryptVerificationStrategy>;

  beforeEach(() => {
    bcryptStrategy = new BcryptVerificationStrategy() as jest.Mocked<BcryptVerificationStrategy>;
    scryptStrategy = new ScryptVerificationStrategy() as jest.Mocked<ScryptVerificationStrategy>;

    factory = new PasswordVerificationFactory();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be properly initialized with strategies', () => {
      expect(factory).toBeDefined();
    });
  });

  describe('getStrategy', () => {
    it('should return BcryptVerificationStrategy for bcrypt hashes', () => {
      const bcryptHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(bcryptHash);

      expect(result).toBe(bcryptStrategy);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(bcryptHash);
      expect(scryptStrategy.canHandle).toHaveBeenCalledWith(bcryptHash);
    });

    it('should return ScryptVerificationStrategy for scrypt hashes', () => {
      const scryptHash = '$scrypt$ln=10,r=8,p=1$c2FsdA==$hash';
      
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(scryptHash);

      expect(result).toBe(scryptStrategy);
      expect(scryptStrategy.canHandle).toHaveBeenCalledWith(scryptHash);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(scryptHash);
    });

    it('should throw error when no strategy can handle the hash', () => {
      const unknownHash = 'unknown-hash-type';
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(false);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      expect(() => factory.getStrategy(unknownHash)).toThrow(
        `No password verification strategy found for hash: unknown-ha...`,
      );
    });

    it('should handle empty string hash', () => {
      const emptyHash = '';
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(emptyHash);

      expect(result).toBe(bcryptStrategy);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(emptyHash);
    });

    it('should handle null hash', () => {
      const nullHash = null as any;
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(nullHash);

      expect(result).toBe(bcryptStrategy);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(nullHash);
    });

    it('should handle undefined hash', () => {
      const undefinedHash = undefined as any;
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(undefinedHash);

      expect(result).toBe(bcryptStrategy);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(undefinedHash);
    });

    it('should prioritize first matching strategy when multiple strategies can handle', () => {
      const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d';
      
      // Both strategies can handle, but scrypt is first
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(true);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(hash);

      expect(result).toBe(scryptStrategy);
      expect(scryptStrategy.canHandle).toHaveBeenCalledWith(hash);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(hash);
    });

    it('should handle very long hash strings', () => {
      const longHash = 'a'.repeat(1000);
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(longHash);

      expect(result).toBe(bcryptStrategy);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(longHash);
    });

    it('should handle hash with special characters', () => {
      const specialHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq7L0p5w5d5j5d5j5d5j5d5j5d5j5d!@#$%^&*()';
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(true);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      const result = factory.getStrategy(specialHash);

      expect(result).toBe(bcryptStrategy);
      expect(bcryptStrategy.canHandle).toHaveBeenCalledWith(specialHash);
    });

    it('should handle error in canHandle method gracefully', () => {
      const hash = 'test-hash';
      
      (bcryptStrategy.canHandle as jest.Mock).mockImplementation(() => {
        throw new Error('Strategy error');
      });
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      expect(() => factory.getStrategy(hash)).toThrow(
        `No password verification strategy found for hash: test-ha...`,
      );
    });

    it('should correctly truncate long hash in error message', () => {
      const veryLongHash = 'a'.repeat(100);
      
      (bcryptStrategy.canHandle as jest.Mock).mockReturnValue(false);
      (scryptStrategy.canHandle as jest.Mock).mockReturnValue(false);

      // Access private strategies array for testing
      const strategies = (factory as any).strategies;
      strategies[0] = scryptStrategy;
      strategies[1] = bcryptStrategy;

      expect(() => factory.getStrategy(veryLongHash)).toThrow(
        `No password verification strategy found for hash: aaaaaaaaaa...`,
      );
    });
  });

  describe('strategy initialization', () => {
    it('should initialize with correct number of strategies', () => {
      const strategies = (factory as any).strategies;
      
      expect(strategies).toHaveLength(2);
      expect(strategies[0]).toBeInstanceOf(ScryptVerificationStrategy);
      expect(strategies[1]).toBeInstanceOf(BcryptVerificationStrategy);
    });

    it('should maintain strategy order (scrypt first, then bcrypt)', () => {
      const strategies = (factory as any).strategies;
      
      expect(strategies[0]).toBeInstanceOf(ScryptVerificationStrategy);
      expect(strategies[1]).toBeInstanceOf(BcryptVerificationStrategy);
    });
  });
});