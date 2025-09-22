import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Role } from '../../role/entities/role.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Task } from '../../tasks/entities/task.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Occupation)
    private readonly occupationRepository: Repository<Occupation>,
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