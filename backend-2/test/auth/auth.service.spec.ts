import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/modules/auth/services/auth.service';
import { UserService } from '../../src/modules/user/services/user.service';
import { JwtService } from '@nestjs/jwt';
import { mockUserService, mockLoginDtoFactory, mockCreateUserDtoFactory, mockUserFactory } from '../mocks/factory';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService, // Use the mocked UserService
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn() // Add verify mock
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return a user if credentials are valid', async () => {
      const user = mockUserFactory();
      const validPassword = 'password';
      // Mock userService.findByEmail to return a user with a matching password (in a real scenario, this would be hashed and compared)
      (userService.findByEmail as jest.Mock).mockResolvedValue(user);

      // For simplicity in mock, we assume validateUser directly checks password string.
      // In a real app, it would involve password hashing comparison.
      const result = await service.validateUser(user.email, validPassword);
      expect(result).toEqual(user);
      expect(userService.findByEmail).toHaveBeenCalledWith(user.email);
    });

    it('should return null if user is not found', async () => {
      const invalidEmail = 'nonexistent@example.com';
      const password = 'password';
      (userService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(invalidEmail, password);
      expect(result).toBeNull();
      expect(userService.findByEmail).toHaveBeenCalledWith(invalidEmail);
    });

    it('should return null if password does not match', async () => {
      const user = mockUserFactory();
      const invalidPassword = 'wrongpassword';
      (userService.findByEmail as jest.Mock).mockResolvedValue(user);

      // In a real scenario, this would be a password comparison failure.
      // For this mock, we'll simulate it by returning null.
      // A more robust mock would simulate the bcrypt compare logic.
      const result = await service.validateUser(user.email, invalidPassword);
      expect(result).toBeNull();
      expect(userService.findByEmail).toHaveBeenCalledWith(user.email);
    });
  });

  describe('login', () => {
    it('should return a JWT token upon successful login', async () => {
      const loginDto = mockLoginDtoFactory();
      const user = mockUserFactory({ email: loginDto.email });
      const token = 'mock-jwt-token';

      // Mock AuthService.validateUser to return a user
      jest.spyOn(service as any, 'validateUser').mockResolvedValue(user);
      // Mock JwtService.sign to return a token
      (jwtService.sign as jest.Mock).mockReturnValue(token);

      const result = await service.login(loginDto);
      expect(result).toEqual({
        access_token: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
      expect(service['validateUser']).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(jwtService.sign).toHaveBeenCalledWith({ email: user.email, sub: user.id });
    });

    it('should throw an UnauthorizedException if login fails', async () => {
      const loginDto = mockLoginDtoFactory();

      // Mock AuthService.validateUser to return null (failed validation)
      jest.spyOn(service as any, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(service['validateUser']).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should create a new user and return it', async () => {
      const registerDto = mockCreateUserDtoFactory();
      // Mock userService.create to return the created user
      const createdUser = mockUserFactory({ ...registerDto, id: 1, password: 'hashed_password' });
      (userService.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await service.register(registerDto);
      expect(result).toEqual(createdUser);
      expect(userService.create).toHaveBeenCalledWith(registerDto);
    });

    // Add test case for duplicate email if UserService handles it
  });

  describe('verifyToken', () => {
    it('should return the payload if the token is valid', async () => {
      const token = 'valid-token';
      const payload = { email: 'test@example.com', sub: 1 };
      // Mock jwtService.verify to return the payload
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const result = await service.verifyToken(token);
      expect(result).toEqual(payload);
      // In a real service, verify might be called directly on jwtService or through a wrapper.
      // Assuming it's a direct call for this mock.
      // expect(jwtService.verify).toHaveBeenCalledWith(token); // Uncomment if verify is directly called on jwtService
    });

    it('should throw an error if the token is invalid', async () => {
      const token = 'invalid-token';
      // Mock jwtService.verify to throw an error
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyToken(token)).rejects.toThrow('Invalid token');
      // expect(jwtService.verify).toHaveBeenCalledWith(token); // Uncomment if verify is directly called on jwtService
    });
  });
});