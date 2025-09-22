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
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

// Mock the entire bcrypt module
jest.mock('bcrypt');
// Mock the entire fs module  
jest.mock('fs');

// Mock for UserRepository
const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
};

// Mock for RoleRepository
const mockRoleRepository = {
  find: jest.fn(),
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
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
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
      const hashedPassword = 'hashedPassword123';
      const createdUser = mockUserFactory({ ...createUserDto, id: 1, password: hashedPassword });

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      (userRepository.create as jest.Mock).mockReturnValue(createdUser);
      (userRepository.save as jest.Mock).mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);
      expect(result).toEqual(createdUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({ ...createUserDto, password: hashedPassword });
      expect(userRepository.save).toHaveBeenCalledWith(createdUser);
    });

    it('should handle bcrypt hash error', async () => {
      const createUserDto: CreateUserDto = mockCreateUserDtoFactory();
      
      // Mock bcrypt hash to throw error
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(service.create(createUserDto)).rejects.toThrow('Hashing failed');
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
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
        relations: ['roles', 'occupations'],
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
        relations: ['roles', 'occupations'],
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      const userId = 999;
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'occupations'],
      });
    });
  });

  describe('findByEmail', () => {
    it('should return a user if found by email', async () => {
      const user = mockUserFactory();
      const mockGetOne = jest.fn().mockResolvedValue(user);
      (userRepository.createQueryBuilder as jest.Mock).mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
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
        leftJoinAndSelect: jest.fn().mockReturnThis(),
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
        relations: ['roles', 'occupations'],
      });
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateUserDto));
    });

    it('should update user with password hashing', async () => {
      const user = mockUserFactory();
      const updateUserDto: UpdateUserDto = { name: 'Updated User Name', password: 'newpassword' };
      const hashedPassword = 'hashedNewPassword';
      const updatedUser = mockUserFactory({ ...user, ...updateUserDto, password: hashedPassword });

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (fs.appendFileSync as jest.Mock).mockImplementation(() => {});
      
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(user.id, updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        'G:/novosApps/manager-group/backend/server.log',
        expect.stringContaining('User 1 updated. Password changed.')
      );
    });

    it('should update user without password change', async () => {
      const user = mockUserFactory();
      const updateUserDto: UpdateUserDto = { name: 'Updated User Name' };
      const updatedUser = mockUserFactory({ ...user, ...updateUserDto });

      (fs.appendFileSync as jest.Mock).mockImplementation(() => {});
      
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(user.id, updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        'G:/novosApps/manager-group/backend/server.log',
        expect.stringContaining('User 1 updated.')
      );
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        'G:/novosApps/manager-group/backend/server.log',
        expect.not.stringContaining('Password changed')
      );
    });

    it('should handle bcrypt hash error during update', async () => {
      const user = mockUserFactory();
      const updateUserDto: UpdateUserDto = { password: 'newpassword' };
      
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);

      await expect(service.update(user.id, updateUserDto)).rejects.toThrow('Hashing failed');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle file system write error', async () => {
      const user = mockUserFactory();
      const updateUserDto: UpdateUserDto = { name: 'Updated User Name' };
      const updatedUser = mockUserFactory({ ...user, ...updateUserDto });

      jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {
        throw new Error('File system error');
      });
      
      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(user.id, updateUserDto);
      expect(result).toEqual(updatedUser);
      // The method should still succeed even if logging fails
    });

    it('should throw NotFoundException if user is not found for update', async () => {
      const userId = 999;
      const updateUserDto: UpdateUserDto = { name: 'Updated User Name' };
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'occupations'],
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
        relations: ['roles', 'occupations'],
      });
      expect(userRepository.remove).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException if user is not found for removal', async () => {
      const userId = 999;
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(userId)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'occupations'],
      });
      expect(userRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to a user', async () => {
      const user = mockUserFactory();
      const roleIds = [1, 2];
      const roles = [mockRoleFactory({ id: 1 }), mockRoleFactory({ id: 2 })];
      // Mocking user with assigned roles using mockRoleFactory
      const updatedUser = mockUserFactory({ ...user, roles });

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (mockRoleRepository.find as jest.Mock).mockResolvedValue(roles);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.assignRoles(user.id, roleIds);
      expect(result).toEqual(updatedUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        relations: ['roles'],
      });
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: { id: expect.arrayContaining(roleIds) }
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
      expect(mockRoleRepository.find).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if some roles are not found', async () => {
      const user = mockUserFactory();
      const roleIds = [1, 2, 3];
      const foundRoles = [mockRoleFactory({ id: 1 }), mockRoleFactory({ id: 2 })]; // Only 2 roles found

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (mockRoleRepository.find as jest.Mock).mockResolvedValue(foundRoles);

      await expect(service.assignRoles(user.id, roleIds)).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        relations: ['roles'],
      });
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: { id: expect.arrayContaining(roleIds) }
      });
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle empty roleIds array', async () => {
      const user = mockUserFactory();
      const roleIds: number[] = [];
      const roles: any[] = [];
      const updatedUser = mockUserFactory({ ...user, roles });

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (mockRoleRepository.find as jest.Mock).mockResolvedValue(roles);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.assignRoles(user.id, roleIds);
      expect(result).toEqual(updatedUser);
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: { id: expect.arrayContaining(roleIds) }
      });
      expect(userRepository.save).toHaveBeenCalledWith(user);
    });

    it('should handle single role assignment', async () => {
      const user = mockUserFactory();
      const roleIds = [1];
      const roles = [mockRoleFactory({ id: 1 })];
      const updatedUser = mockUserFactory({ ...user, roles });

      (userRepository.findOne as jest.Mock).mockResolvedValue(user);
      (mockRoleRepository.find as jest.Mock).mockResolvedValue(roles);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.assignRoles(user.id, roleIds);
      expect(result).toEqual(updatedUser);
      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        where: { id: expect.arrayContaining(roleIds) }
      });
      expect(userRepository.save).toHaveBeenCalledWith(user);
    });
  });
});