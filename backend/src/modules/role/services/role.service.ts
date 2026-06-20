import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    this.logger.log('Creating a new role');
    const role = this.roleRepository.create(createRoleDto);
    return await this.roleRepository.save(role);
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
      throw new NotFoundException(`Função com ID ${id} não encontrada`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    this.logger.log(`Updating role with ID: ${id}`);
    const role = await this.findOne(id);
    Object.assign(role, updateRoleDto);
    return await this.roleRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removing role with ID: ${id}`);
    const role = await this.findOne(id);
    await this.roleRepository.remove(role);
  }
}
