import { validate } from 'class-validator';
import { RefreshTokenDto } from './refresh-token.dto';

describe('RefreshTokenDto', () => {
  let refreshTokenDto: RefreshTokenDto;

  beforeEach(() => {
    refreshTokenDto = new RefreshTokenDto();
  });

  describe('refreshToken validation', () => {
    it('should pass with valid non-empty string', async () => {
      refreshTokenDto.refreshToken = 'valid-refresh-token-123';

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with JWT token format', async () => {
      const jwtTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'short.jwt.token',
      ];

      for (const token of jwtTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should pass with single character', async () => {
      refreshTokenDto.refreshToken = 'a';

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBe(0);
    });

    it('should pass with whitespace characters', async () => {
      const whitespaceTokens = [
        'token with spaces',
        'token\twith\ttabs',
        'token\nwith\nnewlines',
        '  leading and trailing  ',
        '\t\r\n',
      ];

      for (const token of whitespaceTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should pass with special characters', async () => {
      const specialTokens = [
        'token!@#$%^&*()',
        'token-with-dashes',
        'token_with_underscores',
        'token.with.dots',
        'token+plus+signs',
        'token=equals=signs',
        'token/slashes',
        'token\\backslashes',
        'token"quotes"',
        "token'single'quotes",
        'token[brackets]',
        'token{braces}',
        'token(parentheses)',
        'token<angles>',
        'token?question',
        'token:colon',
        'token;semicolon',
        'token,comma',
        'token.period',
        'token`backtick',
        'token~tilde',
      ];

      for (const token of specialTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should pass with unicode characters', async () => {
      const unicodeTokens = [
        'token中文',
        'tokenパスワード',
        'tokenпароль',
        'tokenمفتاح',
        'token漢字',
        'token🎵emoji',
        'tokencafé',
        'tokennaïve',
        'tokenrésumé',
        'tokenMüller',
      ];

      for (const token of unicodeTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should pass with numeric tokens', async () => {
      const numericTokens = [
        '123456',
        '1234567890',
        '0',
        '123',
        '999999999999999999999999999999999999999999999999999',
      ];

      for (const token of numericTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should pass with very long tokens', async () => {
      const longTokens = [
        'a'.repeat(100),
        'a'.repeat(1000),
        'a'.repeat(5000),
        'very-long-refresh-token-with-multiple-segments-and-various-characters-1234567890!@#$%^&*()',
      ];

      for (const token of longTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail with empty string', async () => {
      refreshTokenDto.refreshToken = '';

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('refreshToken');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail with null', async () => {
      refreshTokenDto.refreshToken = null as any;

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('refreshToken');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail with undefined', async () => {
      refreshTokenDto.refreshToken = undefined as any;

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('refreshToken');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail with whitespace only', async () => {
      const whitespaceOnly = [
        ' ',
        '  ',
        '\t',
        '\n',
        '\r',
        '\t\n\r ',
        '     ',
      ];

      for (const token of whitespaceOnly) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('refreshToken');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      }
    });

    it('should fail with non-string types', async () => {
      const nonStringTypes = [
        { value: 123, description: 'number' },
        { value: true, description: 'boolean true' },
        { value: false, description: 'boolean false' },
        { value: {}, description: 'object' },
        { value: [], description: 'array' },
        { value: new Date(), description: 'Date object' },
        { value: /regex/, description: 'RegExp' },
        { value: function() {}, description: 'function' },
      ];

      for (const { value, description } of nonStringTypes) {
        refreshTokenDto.refreshToken = value as any;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('refreshToken');
        expect(errors[0].constraints).toHaveProperty('isString');
      }
    });

    it('should pass with zero-length string after trimming', async () => {
      // This should fail because empty string is not allowed
      refreshTokenDto.refreshToken = '';

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle string conversion edge cases', async () => {
      const edgeCases = [
        { value: String(123), description: 'String from number' },
        { value: String(true), description: 'String from boolean' },
        { value: String(null), description: 'String from null' },
        { value: String(undefined), description: 'String from undefined' },
        { value: (123).toString(), description: 'Number toString()' },
        { value: true.toString(), description: 'Boolean toString()' },
      ];

      for (const { value, description } of edgeCases) {
        refreshTokenDto.refreshToken = value;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle template literal tokens', async () => {
      const templateTokens = [
        `token-${Math.random()}`,
        `user-${Date.now()}`,
        `refresh-${'abc'}`,
        `${'token'}-refresh`,
      ];

      for (const token of templateTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle escaped characters', async () => {
      const escapedTokens = [
        'token\\nwith\\nnewlines',
        'token\\ttwith\\ttabs',
        'token\\"with\\"quotes',
        'token\\\'with\\\'single\\\'quotes',
        'token\\\\with\\\\backslashes',
        'token\\rwith\\rcarriage\\rreturns',
      ];

      for (const token of escapedTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle HTML/XML tokens', async () => {
      const htmlTokens = [
        '<token>value</token>',
        '<refresh>token</refresh>',
        '<auth type="refresh">token</auth>',
        '&token;',
        '&amp;token&amp;',
        '<!-- token -->',
        '<?xml version="1.0"?><token>value</token>',
      ];

      for (const token of htmlTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle URL-like tokens', async () => {
      const urlTokens = [
        'https://example.com/refresh',
        'http://localhost:3000/auth/refresh',
        'bearer token',
        'Basic auth_token',
        'OAuth2.0_token',
        'session_id_12345',
        'csrf_token_abc123',
      ];

      for (const token of urlTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle JSON-like tokens', async () => {
      const jsonTokens = [
        '{"token":"value"}',
        '{"refresh":true,"id":123}',
        '[{"token":"value1"},{"token":"value2"}]',
        '{"access_token":"abc","refresh_token":"def"}',
        'null',
        'undefined',
        'true',
        'false',
        '123',
        '"string"',
      ];

      for (const token of jsonTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle base64 encoded tokens', async () => {
      const base64Tokens = [
        'dG9rZW4xMjM=',
        'cmVmcmVzaF90b2tlbg==',
        'YWNjZXNzX3Rva2Vu',
        'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0lzSW10MVltVnlibVYwSWl3aVlXdzlJam8zTVRVMExURXlNalF0T0dNdE5tSTBNekptTVRFeUxqQTBMVFl0',
      ];

      for (const token of base64Tokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle hexadecimal tokens', async () => {
      const hexTokens = [
        'deadbeef',
        '0x1234567890abcdef',
        'a1b2c3d4e5f6',
        'ABCDEF123456',
        'token_0x123',
      ];

      for (const token of hexTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });

    it('should handle mixed case tokens', async () => {
      const mixedCaseTokens = [
        'ToKeN123',
        'ReFrEsH_ToKeN',
        'CamelCaseToken',
        'snake_case_token',
        'PascalCaseToken',
        'mixedCase-Token_with.variations',
        'UPPERCASE_TOKEN',
        'lowercase_token',
        'MiXeD_cAsE_ToKeN',
      ];

      for (const token of mixedCaseTokens) {
        refreshTokenDto.refreshToken = token;

        const errors = await validate(refreshTokenDto);
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('validation error details', () => {
    it('should provide proper error messages for empty string', async () => {
      refreshTokenDto.refreshToken = '';

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should provide proper error messages for null', async () => {
      refreshTokenDto.refreshToken = null as any;

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should provide proper error messages for non-string types', async () => {
      refreshTokenDto.refreshToken = 123 as any;

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should validate both constraints when multiple are violated', async () => {
      refreshTokenDto.refreshToken = null as any;

      const errors = await validate(refreshTokenDto);
      expect(errors.length).toBeGreaterThan(0);
      const constraints = errors[0].constraints;
      expect(constraints).toHaveProperty('isNotEmpty');
      expect(constraints).toHaveProperty('isString');
    });
  });
});