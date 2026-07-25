import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoleService } from './role.service';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleNotFoundException } from '../exceptions/role-not-found.exception';
import { DuplicateRoleNameException } from '../exceptions/duplicate-role-name.exception';

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  } as unknown as MockRepository<T>;
}

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: MockRepository<Role>;

  const mockRole = {
    id: 1,
    name: 'ADMIN',
    description: 'Administrator',
    users: [],
  } as unknown as Role;

  beforeEach(async () => {
    roleRepository = createMockRepository<Role>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a role', async () => {
      roleRepository.create.mockReturnValue(mockRole);
      roleRepository.save.mockResolvedValue(mockRole);

      const dto: CreateRoleDto = { name: 'ADMIN' } as CreateRoleDto;
      const result = await service.create(dto);

      expect(result).toEqual(mockRole);
      expect(roleRepository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      roleRepository.find.mockResolvedValue([mockRole]);

      const result = await service.findAll();

      expect(result).toEqual([mockRole]);
      expect(roleRepository.find).toHaveBeenCalledWith({
        relations: ['users'],
      });
    });
  });

  describe('findOne', () => {
    it('should return role when found', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.findOne(1);

      expect(result).toEqual(mockRole);
    });

    it('should throw RoleNotFoundException when role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(RoleNotFoundException);
    });
  });

  describe('update', () => {
    it('should update role', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(mockRole) // findOne for the role itself
        .mockResolvedValueOnce(null); // duplicate name check: no conflict
      roleRepository.save.mockResolvedValue({ ...mockRole, name: 'UPDATED' });

      const dto: UpdateRoleDto = { name: 'UPDATED' } as UpdateRoleDto;
      const result = await service.update(1, dto);

      expect(result.name).toBe('UPDATED');
    });

    it('should throw DuplicateRoleNameException when name already exists', async () => {
      const existingRole = {
        ...mockRole,
        id: 2,
        name: 'EXISTING',
      } as unknown as Role;
      roleRepository.findOne
        .mockResolvedValueOnce(mockRole) // findOne for the role itself
        .mockResolvedValueOnce(existingRole); // duplicate name check: conflict

      const dto: UpdateRoleDto = { name: 'EXISTING' } as UpdateRoleDto;

      await expect(service.update(1, dto)).rejects.toThrow(
        DuplicateRoleNameException,
      );
    });
  });

  describe('remove', () => {
    it('should remove role', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);

      await service.remove(1);

      expect(roleRepository.remove).toHaveBeenCalledWith(mockRole);
    });
  });
});
