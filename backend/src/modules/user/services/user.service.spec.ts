import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { RoleNotFoundException } from '../../role/exceptions/role-not-found.exception';
import { OccupationNotFoundException } from '../../occupation/exceptions/occupation-not-found.exception';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

/* eslint-disable sonarjs/no-hardcoded-passwords */

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  } as unknown as MockRepository<T>;
}

interface MockQueryRunner {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  manager: {
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  query: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
}

let mockQueryRunner: MockQueryRunner;

function createMockDataSource(): unknown {
  mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    manager: {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    },
    query: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };
  return {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };
}

describe('UserService', () => {
  let service: UserService;
  let userRepository: MockRepository<User>;
  let roleRepository: MockRepository<Role>;
  let occupationRepository: MockRepository<Occupation>;
  let dataSourceMock: unknown;

  const mockUser = {
    id: 1,
    name: 'John',
    email: 'john@example.com',
    roles: [],
    occupations: [],
  } as unknown as User;

  beforeEach(async () => {
    userRepository = createMockRepository<User>();
    roleRepository = createMockRepository<Role>();
    occupationRepository = createMockRepository<Occupation>();
    dataSourceMock = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        {
          provide: getRepositoryToken(Occupation),
          useValue: occupationRepository,
        },
        { provide: getDataSourceToken(), useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('count', () => {
    it('should return user count', async () => {
      userRepository.count.mockResolvedValue(5);

      const result = await service.count();

      expect(result).toBe(5);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      userRepository.find.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(result).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const createQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(createQueryBuilder);

      const result = await service.findByEmail('john@example.com');

      expect(result).toEqual(mockUser);
    });
  });

  describe('remove', () => {
    it('should remove user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.remove(1);

      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([{ id: 1 } as Role]);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [{ id: 1 } as Role],
      });

      const result = await service.assignRoles(1, [1]);

      expect(result.roles).toHaveLength(1);
    });
  });

  describe('assignOccupations', () => {
    it('should assign occupations to user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      occupationRepository.find.mockResolvedValue([{ id: 1 } as Occupation]);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        occupations: [{ id: 1 } as Occupation],
      });

      const result = await service.assignOccupations(1, [1]);

      expect(result.occupations).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a user and hash the password', async () => {
      const createUserDto = {
        name: 'John',
        email: 'john@example.com',
        password: 'plain_password',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const savedUser = {
        id: 1,
        ...createUserDto,
        password: 'hashed_password',
        roles: [],
        occupations: [],
      } as unknown as User;

      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John',
          email: 'john@example.com',
          password: 'hashed_password',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(userRepository.save).toHaveBeenCalledWith(savedUser);
      expect(result).toEqual(savedUser);
    });

    it('should assign occupations when occupationIds are provided', async () => {
      const createUserDto = {
        name: 'John',
        email: 'john@example.com',
        password: 'plain_password',
        occupationIds: [1, 2],
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const savedUser = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        password: 'hashed_password',
        roles: [],
        occupations: [],
      } as unknown as User;

      const occupations = [
        { id: 1, name: 'Dev' },
        { id: 2, name: 'Designer' },
      ] as unknown as Occupation[];

      userRepository.create.mockReturnValue(savedUser);
      userRepository.save
        .mockResolvedValueOnce(savedUser)
        .mockResolvedValueOnce({
          ...savedUser,
          occupations,
        });

      occupationRepository.find.mockResolvedValue(occupations);

      const result = await service.create(createUserDto);

      expect(occupationRepository.find).toHaveBeenCalledWith({
        where: { id: In([1, 2]) },
      });
      expect(userRepository.save).toHaveBeenCalledTimes(2);
      expect(result.occupations).toEqual(occupations);
    });

    it('should throw OccupationNotFoundException when one or more occupations are not found', async () => {
      const createUserDto = {
        name: 'John',
        email: 'john@example.com',
        password: 'plain_password',
        occupationIds: [1, 2],
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const savedUser = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        password: 'hashed_password',
        roles: [],
        occupations: [],
      } as unknown as User;

      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);
      occupationRepository.find.mockResolvedValue([
        { id: 1, name: 'Dev' } as unknown as Occupation,
      ]);

      await expect(service.create(createUserDto)).rejects.toThrow(
        OccupationNotFoundException,
      );
    });
  });

  describe('createFirstAdmin', () => {
    it('should create first admin when count is 0 and ADMIN role exists', async () => {
      const setupDto = {
        name: 'Admin',
        email: 'admin@example.com',
        password: 'admin_pass',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_admin_pass');

      mockQueryRunner.manager.count.mockResolvedValue(0);
      mockQueryRunner.manager.create.mockReturnValue({
        ...setupDto,
        password: 'hashed_admin_pass',
        is_active: true,
      });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: 1,
        ...setupDto,
        password: 'hashed_admin_pass',
      });
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 1, name: 'ADMIN' } as Role)
        .mockResolvedValueOnce({
          id: 1,
          roles: [{ id: 1, name: 'ADMIN' }],
        } as unknown as User);

      const result = await service.createFirstAdmin(setupDto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        `INSERT INTO users_roles (user_id, role_id) VALUES ($1, $2)`,
        [1, 1],
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 1, roles: expect.any(Array) }),
      );
    });

    it('should throw ForbiddenException when users already exist', async () => {
      const setupDto = {
        name: 'Admin',
        email: 'admin@example.com',
        password: 'admin_pass',
      };

      mockQueryRunner.manager.count.mockResolvedValue(1);

      await expect(service.createFirstAdmin(setupDto)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw RoleNotFoundException when ADMIN role does not exist', async () => {
      const setupDto = {
        name: 'Admin',
        email: 'admin@example.com',
        password: 'admin_pass',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_admin_pass');

      mockQueryRunner.manager.count.mockResolvedValue(0);
      mockQueryRunner.manager.create.mockReturnValue({
        ...setupDto,
        password: 'hashed_admin_pass',
        is_active: true,
      });
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1 });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.createFirstAdmin(setupDto)).rejects.toThrow(
        RoleNotFoundException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user and hash password if provided', async () => {
      const updateUserDto = {
        name: 'Updated John',
        password: 'new_password',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');

      const existingUser = { ...mockUser } as User;
      userRepository.findOne.mockResolvedValue(existingUser);

      const updatedUser = {
        ...existingUser,
        name: 'Updated John',
        password: 'new_hashed_password',
      } as unknown as User;

      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(1, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('new_password', 10);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated John',
          password: 'new_hashed_password',
        }),
      );
      expect(result.name).toBe('Updated John');
      expect(result.password).toBe('new_hashed_password');
    });

    it('should throw UserNotFoundException when updating non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Ghost' })).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });
});
