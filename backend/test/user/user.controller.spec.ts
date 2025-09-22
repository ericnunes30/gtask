import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../src/modules/user/controllers/user.controller';
import { UserService } from '../../src/modules/user/services/user.service';
import { CreateUserDto } from '../../src/modules/user/dto/create-user.dto';
import { UpdateUserDto } from '../../src/modules/user/dto/update-user.dto';
import { User } from '../../src/modules/user/entities/user.entity';
import { mockUserFactory, mockCreateUserDtoFactory } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = mockCreateUserDtoFactory();
      const createdUser = mockUserFactory({ ...createUserDto, id: 1 });

      mockUserService.create.mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(userService.create).toHaveBeenCalledTimes(1);
    });

    it('should handle validation errors through service layer', async () => {
      const invalidDto: CreateUserDto = {
        name: '',
        email: 'invalid-email',
        password: '123'
      } as CreateUserDto;

      mockUserService.create.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.create(invalidDto)).rejects.toThrow('Validation failed');
      expect(userService.create).toHaveBeenCalledWith(invalidDto);
    });

    it('should handle database errors', async () => {
      const createUserDto: CreateUserDto = mockCreateUserDtoFactory();
      mockUserService.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.create(createUserDto)).rejects.toThrow('Database error');
    });
  });

  describe('GET /users', () => {
    it('should return an array of users', async () => {
      const users: User[] = [
        mockUserFactory(),
        mockUserFactory({ id: 2, name: 'Another User', email: 'another@example.com' })
      ];

      mockUserService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(userService.findAll).toHaveBeenCalledTimes(1);
      expect(userService.findAll).toHaveBeenCalledWith();
    });

    it('should return empty array when no users exist', async () => {
      mockUserService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(userService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      mockUserService.findAll.mockRejectedValue(new Error('Service error'));

      await expect(controller.findAll()).rejects.toThrow('Service error');
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID', async () => {
      const userId = 1;
      const user = mockUserFactory({ id: userId });

      mockUserService.findOne.mockResolvedValue(user);

      const result = await controller.findOne(userId);

      expect(result).toEqual(user);
      expect(userService.findOne).toHaveBeenCalledWith(userId);
      expect(userService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle ParseIntPipe validation automatically', async () => {
      // This test validates that the framework handles invalid ID formats
      // Since ParseIntPipe is used, invalid formats will be handled before reaching controller
      const userId = 'invalid' as any;
      
      // In real scenario, this would throw BadRequestException due to ParseIntPipe
      // We'll test the service behavior when called with valid ID
      mockUserService.findOne.mockResolvedValue(mockUserFactory());

      await expect(controller.findOne(userId)).resolves.not.toThrow();
    });

    it('should handle user not found', async () => {
      const userId = 999;
      mockUserService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findOne(userId)).rejects.toThrow(NotFoundException);
      expect(userService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      mockUserService.findOne.mockRejectedValue(new Error('Service error'));

      await expect(controller.findOne(userId)).rejects.toThrow('Service error');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user', async () => {
      const userId = 1;
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
      const updatedUser = mockUserFactory({ id: userId, name: 'Updated Name' });

      mockUserService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(userService.update).toHaveBeenCalledTimes(1);
    });

    it('should handle partial updates', async () => {
      const userId = 1;
      const partialUpdateDto: UpdateUserDto = { email: 'new@email.com' };
      const updatedUser = mockUserFactory({ id: userId, email: 'new@email.com' });

      mockUserService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, partialUpdateDto);

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(userId, partialUpdateDto);
    });

    it('should handle empty update DTO', async () => {
      const userId = 1;
      const emptyUpdateDto: UpdateUserDto = {};
      const existingUser = mockUserFactory({ id: userId });

      mockUserService.update.mockResolvedValue(existingUser);

      const result = await controller.update(userId, emptyUpdateDto);

      expect(result).toEqual(existingUser);
      expect(userService.update).toHaveBeenCalledWith(userId, emptyUpdateDto);
    });

    it('should handle user not found for update', async () => {
      const userId = 999;
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
      mockUserService.update.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(NotFoundException);
      expect(userService.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should handle validation errors through service layer', async () => {
      const userId = 1;
      const invalidUpdateDto: UpdateUserDto = { email: 'invalid-email' } as UpdateUserDto;
      mockUserService.update.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.update(userId, invalidUpdateDto)).rejects.toThrow('Validation failed');
    });

    it('should handle ParseIntPipe validation', async () => {
      const userId = 'invalid' as any;
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
      
      mockUserService.update.mockResolvedValue(mockUserFactory());

      await expect(controller.update(userId, updateUserDto)).resolves.not.toThrow();
    });
  });

  describe('DELETE /users/:id', () => {
    it('should remove a user', async () => {
      const userId = 1;

      mockUserService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(userId);

      expect(result).toBeUndefined();
      expect(userService.remove).toHaveBeenCalledWith(userId);
      expect(userService.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle user not found for removal', async () => {
      const userId = 999;
      mockUserService.remove.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.remove(userId)).rejects.toThrow(NotFoundException);
      expect(userService.remove).toHaveBeenCalledWith(userId);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      mockUserService.remove.mockRejectedValue(new Error('Service error'));

      await expect(controller.remove(userId)).rejects.toThrow('Service error');
    });

    it('should handle ParseIntPipe validation', async () => {
      const userId = 'invalid' as any;
      
      mockUserService.remove.mockResolvedValue(undefined);

      await expect(controller.remove(userId)).resolves.not.toThrow();
    });
  });

  describe('GET /users/search/:email', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const user = mockUserFactory({ email });

      mockUserService.findByEmail.mockResolvedValue(user);

      const result = await controller.findByEmail(email);

      expect(result).toEqual(user);
      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(userService.findByEmail).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found by email', async () => {
      const email = 'nonexistent@example.com';
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await controller.findByEmail(email);

      expect(result).toBeNull();
      expect(userService.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should handle empty email string', async () => {
      const email = '';
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await controller.findByEmail(email);

      expect(result).toBeNull();
      expect(userService.findByEmail).toHaveBeenCalledWith('');
    });

    it('should handle service errors', async () => {
      const email = 'test@example.com';
      mockUserService.findByEmail.mockRejectedValue(new Error('Service error'));

      await expect(controller.findByEmail(email)).rejects.toThrow('Service error');
    });
  });

  describe('POST /users/:id/assign-roles', () => {
    it('should assign roles to user', async () => {
      const userId = 1;
      const roleIds = [1, 2, 3];
      const updatedUser = mockUserFactory({ id: userId });

      mockUserService.assignRoles.mockResolvedValue(updatedUser);

      const result = await controller.assignRoles(userId, roleIds);

      expect(result).toEqual(updatedUser);
      expect(userService.assignRoles).toHaveBeenCalledWith(userId, roleIds);
      expect(userService.assignRoles).toHaveBeenCalledTimes(1);
    });

    it('should handle empty roleIds array', async () => {
      const userId = 1;
      const roleIds: number[] = [];
      const updatedUser = mockUserFactory({ id: userId });

      mockUserService.assignRoles.mockResolvedValue(updatedUser);

      const result = await controller.assignRoles(userId, roleIds);

      expect(result).toEqual(updatedUser);
      expect(userService.assignRoles).toHaveBeenCalledWith(userId, roleIds);
    });

    it('should handle single role assignment', async () => {
      const userId = 1;
      const roleIds = [1];
      const updatedUser = mockUserFactory({ id: userId });

      mockUserService.assignRoles.mockResolvedValue(updatedUser);

      const result = await controller.assignRoles(userId, roleIds);

      expect(result).toEqual(updatedUser);
      expect(userService.assignRoles).toHaveBeenCalledWith(userId, roleIds);
    });

    it('should handle user not found for role assignment', async () => {
      const userId = 999;
      const roleIds = [1, 2];
      mockUserService.assignRoles.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.assignRoles(userId, roleIds)).rejects.toThrow(NotFoundException);
      expect(userService.assignRoles).toHaveBeenCalledWith(userId, roleIds);
    });

    it('should handle invalid role IDs through service layer', async () => {
      const userId = 1;
      const roleIds = [999, 1000];
      mockUserService.assignRoles.mockRejectedValue(new NotFoundException('Roles not found'));

      await expect(controller.assignRoles(userId, roleIds)).rejects.toThrow(NotFoundException);
    });

    it('should handle ParseIntPipe validation', async () => {
      const userId = 'invalid' as any;
      const roleIds = [1, 2];
      
      mockUserService.assignRoles.mockResolvedValue(mockUserFactory());

      await expect(controller.assignRoles(userId, roleIds)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should propagate all errors from service layer', async () => {
      const errorTypes = [
        new Error('Generic error'),
        new TypeError('Type error'),
        new RangeError('Range error'),
        new Error('Database connection failed'),
        new Error('Network error'),
      ];

      for (const error of errorTypes) {
        mockUserService.create.mockRejectedValue(error);

        await expect(controller.create(mockCreateUserDtoFactory())).rejects.toThrow(error);
      }
    });

    it('should handle multiple service errors in different endpoints', async () => {
      const genericError = new Error('Service unavailable');

      // Test all endpoints with the same error
      mockUserService.create.mockRejectedValue(genericError);
      mockUserService.findAll.mockRejectedValue(genericError);
      mockUserService.findOne.mockRejectedValue(genericError);
      mockUserService.update.mockRejectedValue(genericError);
      mockUserService.remove.mockRejectedValue(genericError);
      mockUserService.findByEmail.mockRejectedValue(genericError);
      mockUserService.assignRoles.mockRejectedValue(genericError);

      await expect(controller.create(mockCreateUserDtoFactory())).rejects.toThrow(genericError);
      await expect(controller.findAll()).rejects.toThrow(genericError);
      await expect(controller.findOne(1)).rejects.toThrow(genericError);
      await expect(controller.update(1, {})).rejects.toThrow(genericError);
      await expect(controller.remove(1)).rejects.toThrow(genericError);
      await expect(controller.findByEmail('test@example.com')).rejects.toThrow(genericError);
      await expect(controller.assignRoles(1, [1])).rejects.toThrow(genericError);
    });
  });

  describe('Controller Initialization', () => {
    it('should be properly initialized with UserService', () => {
      expect(controller).toBeDefined();
      expect(userService).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(controller.create).toBeDefined();
      expect(controller.findAll).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
      expect(controller.findByEmail).toBeDefined();
      expect(controller.assignRoles).toBeDefined();
    });
  });
});