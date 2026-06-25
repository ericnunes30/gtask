import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';

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

function createMockDataSource(): unknown {
  return {
    createQueryRunner: jest.fn().mockReturnValue({
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
    }),
  };
}

describe('UserService', () => {
  let service: UserService;
  let userRepository: MockRepository<User>;
  let roleRepository: MockRepository<Role>;
  let occupationRepository: MockRepository<Occupation>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        {
          provide: getRepositoryToken(Occupation),
          useValue: occupationRepository,
        },
        { provide: getDataSourceToken(), useValue: createMockDataSource() },
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
});
