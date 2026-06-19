import { Injectable, NotFoundException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Role } from '../../role/entities/role.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Task } from '../../tasks/entities/task.entity';
import { SetupDto } from '../../auth/dto/setup.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Occupation)
    private readonly occupationRepository: Repository<Occupation>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

async create(createUserDto: CreateUserDto): Promise<User> {
    const { occupationIds, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(userData.password, 10); // 10 is the salt rounds
    
    // Criar o usuário com timestamps definidos
    const user = this.userRepository.create({ 
      ...userData, 
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Salvar o usuário primeiro
    const savedUser = await this.userRepository.save(user);
    
    // Se occupationIds foi fornecido, atribuir as occupations ao usuário
    if (occupationIds && occupationIds.length > 0) {
      const occupations = await this.occupationRepository.find({
        where: { id: In(occupationIds) }
      });
      
      if (occupations.length !== occupationIds.length) {
        throw new NotFoundException('Uma ou mais occupations não foram encontradas');
      }
      
      // Atribuir as occupations ao usuário
      savedUser.occupations = occupations;
      await this.userRepository.save(savedUser);
    }
    
    return savedUser;
  }

  async count(): Promise<number> {
    return await this.userRepository.count();
  }

  async createFirstAdmin(data: SetupDto): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const count = await queryRunner.manager.count(User);
      if (count > 0) {
        throw new ForbiddenException('Setup already completed. Please login.');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = queryRunner.manager.create(User, {
        ...data,
        password: hashedPassword,
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedUser = await queryRunner.manager.save(User, user);

      const adminRole = await queryRunner.manager.findOne(Role, {
        where: { name: 'ADMIN' },
      });

      if (!adminRole) {
        throw new InternalServerErrorException(
          'ADMIN role not found. Ensure api-security-hardening migration has run.'
        );
      }

      await queryRunner.query(
        `INSERT INTO users_roles (user_id, role_id) VALUES ($1, $2)`,
        [savedUser.id, adminRole.id]
      );

      const userWithRoles = await queryRunner.manager.findOne(User, {
        where: { id: savedUser.id },
        relations: ['roles'],
      });

      await queryRunner.commitTransaction();

      return userWithRoles ?? savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      select: ['id', 'name', 'email', 'createdAt', 'updatedAt', 'is_active', 'whatsapp'],
      relations: ['roles', 'occupations'],
    });
  }

  async findOne(id: number): Promise<User> {
    console.log(`[UserService] findOne called for ID: ${id}`);
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'occupations'], // Temporarily removed 'projects', 'tasks'
    });
    
    console.log(`[UserService] findOne result for ID ${id}:`, user);

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }
    
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles') // Load the roles relationship
      .select(['user.id', 'user.name', 'user.email', 'user.password', 'user.createdAt', 'user.updatedAt', 'roles.id', 'roles.name']) // Select role properties
      .where('user.email = :email', { email })
      .getOne();
    
    return user; // Retorna null se não encontrar, não lança exceção
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);

    const logMessage = `[${new Date().toISOString()}] User ${savedUser.id} updated. ${updateUserDto.password ? 'Password changed.' : ''}\n`;
    fs.appendFileSync('G:/novosApps/manager-group/backend/server.log', logMessage);

    return savedUser;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async assignRoles(userId: number, roleIds: number[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Buscar roles válidos pelos IDs fornecidos
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) }
    });
    
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('Uma ou mais roles não foram encontradas');
    }

    // Atribuir as roles ao usuário
    user.roles = roles;
    
    return await this.userRepository.save(user);
  }

  async assignOccupations(userId: number, occupationIds: number[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['occupations'],
    });
    
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Buscar occupations válidos pelos IDs fornecidos
    const occupations = await this.occupationRepository.find({
      where: { id: In(occupationIds) }
    });
    
    if (occupations.length !== occupationIds.length) {
      throw new NotFoundException('Uma ou mais ocupações não foram encontradas');
    }

    // Atribuir as occupations ao usuário
    user.occupations = occupations;
    
    return await this.userRepository.save(user);
  }
}