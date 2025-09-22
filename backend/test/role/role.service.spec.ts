import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from '../../src/modules/role/services/role.service';
import { CreateRoleDto } from '../../src/modules/role/dto/create-role.dto';
import { UpdateRoleDto } from '../../src/modules/role/dto/update-role.dto';
// Correcting imports based on the factory file content
import { mockRoleFactory, mockCreateRoleDtoFactory, mockUserFactory } from '../mocks/factory'; // Added mockUserFactory if needed for relations
import { NotFoundException } from '@nestjs/common';
import { Role } from '../../src/modules/role/entities/role.entity';
import { User } from '../../src/modules/user/entities/user.entity';

// Mock for RoleRepository
const mockRoleRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: 'RoleRepository', // Token for RoleRepository
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepository = module.get<any>('RoleRepository');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const createRoleDto: CreateRoleDto = mockCreateRoleDtoFactory();
      const createdRole = mockRoleFactory({ ...createRoleDto, id: 1 });

      (roleRepository.create as jest.Mock).mockReturnValue(createdRole);
      (roleRepository.save as jest.Mock).mockResolvedValue(createdRole);

      const result = await service.create(createRoleDto);
      expect(result).toEqual(createdRole);
      expect(roleRepository.create).toHaveBeenCalledWith(createRoleDto);
      expect(roleRepository.save).toHaveBeenCalledWith(createdRole);
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      const roles: Role[] = [mockRoleFactory(), mockRoleFactory({ id: 2, name: 'Another Role' })];
      (roleRepository.find as jest.Mock).mockResolvedValue(roles);

      const result = await service.findAll();
      expect(result).toEqual(roles);
      expect(roleRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a role if found', async () => {
      const role = mockRoleFactory();
      (roleRepository.findOne as jest.Mock).mockResolvedValue(role);

      const result = await service.findOne(role.id);
      expect(result).toEqual(role);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: role.id }, relations: ['users'] });
    });

    it('should throw NotFoundException if role is not found', async () => {
      const roleId = 999;
      (roleRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(roleId)).rejects.toThrow(NotFoundException);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId }, relations: ['users'] });
    });
  });

  describe('update', () => {
    it('should update a role if found', async () => {
      const role = mockRoleFactory();
      const updateRoleDto: UpdateRoleDto = { name: 'Updated Role Name' };
      const updatedRole = mockRoleFactory({ ...role, ...updateRoleDto });

      (roleRepository.findOne as jest.Mock).mockResolvedValue(role);
      (roleRepository.save as jest.Mock).mockResolvedValue(updatedRole);

      const result = await service.update(role.id, updateRoleDto);
      expect(result).toEqual(updatedRole);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: role.id }, relations: ['users'] });
      expect(roleRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateRoleDto));
    });

    it('should throw NotFoundException if role is not found', async () => {
      const roleId = 999;
      const updateRoleDto: UpdateRoleDto = { name: 'Updated Role Name' };
      (roleRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(roleId, updateRoleDto)).rejects.toThrow(NotFoundException);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId }, relations: ['users'] });
      expect(roleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a role if found', async () => {
      const role = mockRoleFactory();
      (roleRepository.findOne as jest.Mock).mockResolvedValue(role);
      (roleRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.remove(role.id);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: role.id }, relations: ['users'] });
      expect(roleRepository.remove).toHaveBeenCalledWith(role);
    });

    it('should throw NotFoundException if role is not found', async () => {
      const roleId = 999;
      (roleRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(roleId)).rejects.toThrow(NotFoundException);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId }, relations: ['users'] });
      expect(roleRepository.remove).not.toHaveBeenCalled();
    });
  });
});