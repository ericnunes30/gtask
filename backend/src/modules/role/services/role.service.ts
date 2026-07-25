import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleNotFoundException } from '../exceptions/role-not-found.exception';
import { DuplicateRoleNameException } from '../exceptions/duplicate-role-name.exception';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    this.logger.log('Creating a new role');
    const existing = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });
    if (existing) {
      throw new DuplicateRoleNameException(createRoleDto.name);
    }
    const role = this.roleRepository.create(createRoleDto);
    const savedRole = await this.roleRepository.save(role);

    this.eventEmitter.emit('role.created', { role: savedRole });

    return savedRole;
  }

  async findAll(): Promise<Role[]> {
    this.logger.log('Finding all roles');
    try {
      const roles = await this.roleRepository.find({
        relations: ['users'],
      });
      this.logger.log(`Found ${roles.length} roles`);
      return roles;
    } catch (error: unknown) {
      this.logger.error(
        `Error finding all roles: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async findOne(id: number): Promise<Role> {
    this.logger.log(`Finding role with ID: ${id}`);
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      this.logger.warn(`Role with ID ${id} not found`);
      throw new RoleNotFoundException(id);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    this.logger.log(`Updating role with ID: ${id}`);
    const role = await this.findOne(id);
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });
      if (existing) {
        throw new DuplicateRoleNameException(updateRoleDto.name);
      }
    }
    Object.assign(role, updateRoleDto);
    const savedRole = await this.roleRepository.save(role);

    this.eventEmitter.emit('role.updated', { role: savedRole });

    return savedRole;
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removing role with ID: ${id}`);
    const role = await this.findOne(id);
    await this.roleRepository.remove(role);

    this.eventEmitter.emit('role.deleted', { roleId: id });
  }
}
