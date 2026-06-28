jest.mock('bcrypt');
jest.mock('scrypt-js');

import * as bcrypt from 'bcrypt';
import * as scrypt from 'scrypt-js';
import * as crypto from 'crypto';
import { PasswordVerificationFactory } from './password-verification.factory';
import { BcryptVerificationStrategy } from './bcrypt-verification.strategy';
import { ScryptVerificationStrategy } from './scrypt-verification.strategy';

describe('PasswordVerificationFactory', () => {
  let factory: PasswordVerificationFactory;

  beforeEach(() => {
    factory = new PasswordVerificationFactory();
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('getStrategy', () => {
    it('should return ScryptVerificationStrategy for $scrypt$ hash', () => {
      const hash = '$scrypt$n=32768,r=8,p=1$salt$hash';

      const strategy = factory.getStrategy(hash);

      expect(strategy).toBeInstanceOf(ScryptVerificationStrategy);
    });

    it('should return BcryptVerificationStrategy for bcrypt-like hash', () => {
      const hash = '$2b$10$abcdefghijklmnopqrstuv';

      const strategy = factory.getStrategy(hash);

      expect(strategy).toBeInstanceOf(BcryptVerificationStrategy);
    });
  });
});

describe('BcryptVerificationStrategy', () => {
  let strategy: BcryptVerificationStrategy;
  const mockedCompare = jest.mocked(bcrypt.compare);

  beforeEach(() => {
    strategy = new BcryptVerificationStrategy();
    mockedCompare.mockClear();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for non-scrypt hashes', () => {
      expect(strategy.canHandle('$2b$10$hash')).toBe(true);
    });

    it('should return false for scrypt hashes', () => {
      expect(strategy.canHandle('$scrypt$n=1,r=1,p=1$salt$hash')).toBe(false);
    });
  });

  describe('verify', () => {
    it('should return true when passwords match exactly', async () => {
      const result = await strategy.verify('password', 'password');

      expect(result).toBe(true);
      expect(mockedCompare).not.toHaveBeenCalled();
    });

    it('should return true when bcrypt.compare succeeds', async () => {
      mockedCompare.mockResolvedValue(true);

      const result = await strategy.verify('password', '$2b$10$hash');

      expect(result).toBe(true);
      expect(mockedCompare).toHaveBeenCalledWith('password', '$2b$10$hash');
    });

    it('should return false when bcrypt.compare fails', async () => {
      mockedCompare.mockResolvedValue(false);

      const result = await strategy.verify('password', '$2b$10$hash');

      expect(result).toBe(false);
    });

    it('should return false when bcrypt.compare throws', async () => {
      mockedCompare.mockRejectedValue(new Error('fail'));

      const result = await strategy.verify('password', '$2b$10$hash');

      expect(result).toBe(false);
    });
  });
});

describe('ScryptVerificationStrategy', () => {
  let strategy: ScryptVerificationStrategy;
  const mockedScrypt = jest.mocked(scrypt.scrypt);

  beforeEach(() => {
    strategy = new ScryptVerificationStrategy();
    mockedScrypt.mockClear();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for scrypt hashes', () => {
      expect(strategy.canHandle('$scrypt$n=1,r=1,p=1$salt$hash')).toBe(true);
    });

    it('should return false for non-scrypt hashes', () => {
      expect(strategy.canHandle('$2b$10$hash')).toBe(false);
    });
  });

  describe('verify', () => {
    it('should return true when derived key matches expected hash', async () => {
      const salt = crypto.randomBytes(16).toString('base64');
      const expectedHash = crypto.randomBytes(32).toString('base64');
      const hash = `$scrypt$n=32768,r=8,p=1$${salt}$${expectedHash}`;
      const derivedKey = Buffer.from(expectedHash, 'base64');

      mockedScrypt.mockResolvedValue(derivedKey);

      const result = await strategy.verify('password', hash);

      expect(result).toBe(true);
      expect(mockedScrypt).toHaveBeenCalled();
    });

    it('should return false when derived key does not match expected hash', async () => {
      const salt = crypto.randomBytes(16).toString('base64');
      const expectedHash = crypto.randomBytes(32).toString('base64');
      const hash = `$scrypt$n=32768,r=8,p=1$${salt}$${expectedHash}`;
      const derivedKey = crypto.randomBytes(32);

      mockedScrypt.mockResolvedValue(derivedKey);

      const result = await strategy.verify('password', hash);

      expect(result).toBe(false);
    });

    it('should return false for invalid hash format (missing parts)', async () => {
      const result = await strategy.verify('password', '$scrypt$');

      expect(result).toBe(false);
      expect(mockedScrypt).not.toHaveBeenCalled();
    });

    it('should return false for invalid hash format (wrong parts count)', async () => {
      const result = await strategy.verify(
        'password',
        '$scrypt$n=1,r=1,p=1$onlySalt',
      );

      expect(result).toBe(false);
      expect(mockedScrypt).not.toHaveBeenCalled();
    });

    it('should return false when scrypt throws', async () => {
      mockedScrypt.mockRejectedValue(new Error('scrypt error'));

      const result = await strategy.verify(
        'password',
        '$scrypt$n=1,r=1,p=1$c2FsdA==$aGFzaA==',
      );

      expect(result).toBe(false);
    });
  });
});
