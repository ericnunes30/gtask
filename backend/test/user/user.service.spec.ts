import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../src/modules/user/services/user.service';
import { CreateUserDto } from '../../src/modules/user/dto/create-user.dto';
import { UpdateUserDto } from '../../src/modules/user/dto/update-user.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
// Correcting imports based on the factory file content
import { mockUserFactory, mockCreateUserDtoFactory, mockRoleFactory } from '../mocks/factory'; // Added mockRoleFactory for assignRoles test
import { NotFoundException } from '@nestjs/common';
import { User } from '../../src/modules/user/entities/user.entity';
import { Role } from '../../src/modules/role/entities/role.entity'; // Import Role entity

// Mock for UserRepository
const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
};

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = mockCreateUserDtoFactory();
      const createdUser = mockUserFactory({ ...createUserDto, id: 1 });

      (userRepository.create as jest.Mock).mockReturnValue(createdUser);
      (userRepository.save as jest.Mock).mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);
      expect(result).toEqual(createdUser);
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(userRepository.save).toHaveBeenCalledWith(createdUser);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users: User[] = [mockUserFactory(), mockUserFactory({ id: 2, name: 'Another User' })];
      (userRepository.find as jest.Mock).mockResolvedValue(users);

      const result = await service.findAll();
      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalledWith({
        select: ['id', 'name', 'email', 'createdAt', 'updatedAt'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const user = mockUserFactory();
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.findOne(user.id);
      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        relations: ['roles', 'occupations', 'projects', 'tasks'],
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      const userId = 999;
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'occupations', 'projects', 'tasks'],
      });
    });
  });

  describe('findByEmail', () => {
    it('should return a user if found by email', async () => {
      const user = mockUserFactory();
      const mockGetOne = jest.fn().mockResolvedValue(user);
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: mockGetOne,
      });

      const result = await service.findByEmail(user.email);
      expect(result).toEqual(user);
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    });

    it('should return null if user is not found by email', async () => {
      const email = 'nonexistent@example.com';
      const mockGetOne = jest.fn().mockResolvedValue(null);
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: mockGetOne,
      });

      const result = await service.findByEmail(email);
      expect(result).toBeNull();
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    });
  });

  describe('update', () => {
    it('should update a user if found', async () => {
      const user = mockUserFactory();
      const updateUserDto: UpdateUserDto = { name: 'Updated User Name' };
      const updatedUser = mockUserFactory({ ...user, ...updateUserDto });

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(user.id, updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        relations: ['roles', 'occupations', 'projects', 'tasks'],
      });
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateUserDto));
    });

    it('should throw NotFoundException if user is not found for update', async () => {
      const userId = 999;
      const updateUserDto: UpdateUserDto = { name: 'Updated User Name' };
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'occupations', 'projects', 'tasks'],
      });
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a user if found', async () => {
      const user = mockUserFactory();
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.remove(user.id);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        relations: ['roles', 'occupations', 'projects', 'tasks'],
      });
      expect(userRepository.remove).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user is not found for removal', async () => {
      const userId = 999;
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(userId)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'occupations', 'projects', 'tasks'],
      });
      expect(userRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to a user', async () => {
      const user = mockUserFactory();
      const roleIds = [1, 2];
      // Mocking user with assigned roles using mockRoleFactory
      const updatedUser = mockUserFactory({ ...user, roles: [mockRoleFactory({ id: 1 }), mockRoleFactory({ id: 2 })] });

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.assignRoles(user.id, roleIds);
      expect(result).toEqual(updatedUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        relations: ['roles'],
      });
      expect(userRepository.save).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user is not found for role assignment', async () => {
      const userId = 999;
      const roleIds = [1, 2];
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.assignRoles(userId, roleIds)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles'],
      });
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});