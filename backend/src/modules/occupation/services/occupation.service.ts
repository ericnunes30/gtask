import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Occupation } from '../entities/occupation.entity';
import { User } from '../../user/entities/user.entity';
import { CreateOccupationDto } from '../dto/create-occupation.dto';
import { UpdateOccupationDto } from '../dto/update-occupation.dto';
import { OccupationNotFoundException } from '../exceptions/occupation-not-found.exception';
import { DuplicateOccupationNameException } from '../exceptions/duplicate-occupation-name.exception';
import { UserNotInOccupationException } from '../exceptions/user-not-in-occupation.exception';
import { UserNotFoundException } from '../../user/exceptions/user-not-found.exception';

@Injectable()
export class OccupationService {
  private readonly logger = new Logger(OccupationService.name);

  constructor(
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createOccupationDto: CreateOccupationDto): Promise<Occupation> {
    this.logger.log('Creating a new occupation');
    const existing = await this.occupationRepository.findOne({
      where: { name: createOccupationDto.name },
    });
    if (existing) {
      throw new DuplicateOccupationNameException(createOccupationDto.name);
    }
    const occupation = this.occupationRepository.create(createOccupationDto);
    return await this.occupationRepository.save(occupation);
  }

  async findAll(): Promise<Occupation[]> {
    this.logger.log('Finding all occupations');
    try {
      const occupations = await this.occupationRepository.find({
        relations: ['users', 'projects', 'tasks'],
      });
      this.logger.log(`Found ${occupations.length} occupations`);
      return occupations;
    } catch (error: unknown) {
      this.logger.error(
        `Error finding all occupations: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async findOne(id: number): Promise<Occupation> {
    this.logger.log(`Finding occupation with ID: ${id}`);
    const occupation = await this.occupationRepository.findOne({
      where: { id },
      relations: ['users', 'projects', 'tasks'],
    });

    if (!occupation) {
      this.logger.warn(`Occupation with ID ${id} not found`);
      throw new OccupationNotFoundException(id);
    }

    return occupation;
  }

  async update(
    id: number,
    updateOccupationDto: UpdateOccupationDto,
  ): Promise<Occupation> {
    this.logger.log(`Updating occupation with ID: ${id}`);
    const occupation = await this.findOne(id);
    if (
      updateOccupationDto.name &&
      updateOccupationDto.name !== occupation.name
    ) {
      const existing = await this.occupationRepository.findOne({
        where: { name: updateOccupationDto.name },
      });
      if (existing) {
        throw new DuplicateOccupationNameException(updateOccupationDto.name);
      }
    }
    Object.assign(occupation, updateOccupationDto);
    return await this.occupationRepository.save(occupation);
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removing occupation with ID: ${id}`);
    const occupation = await this.findOne(id);
    await this.occupationRepository.remove(occupation);
  }

  async addUserToOccupation(
    occupationId: number,
    userId: number,
  ): Promise<Occupation> {
    this.logger.log(`Adding user ${userId} to occupation ${occupationId}`);

    // Buscar a ocupação com os usuários atuais
    const occupation = await this.occupationRepository.findOne({
      where: { id: occupationId },
      relations: ['users'],
    });

    if (!occupation) {
      throw new OccupationNotFoundException(occupationId);
    }

    // Buscar o usuário
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Verificar se o usuário já está na ocupação
    const userAlreadyInOccupation = occupation.users?.some(
      (u) => u.id === userId,
    );
    if (userAlreadyInOccupation) {
      this.logger.warn(
        `User ${userId} is already in occupation ${occupationId}`,
      );
      return occupation; // Retorna a ocupação sem modificar
    }

    // Adicionar o usuário à ocupação
    if (!occupation.users) {
      occupation.users = [];
    }
    occupation.users.push(user);

    return await this.occupationRepository.save(occupation);
  }

  async removeUserFromOccupation(
    occupationId: number,
    userId: number,
  ): Promise<void> {
    this.logger.log(`Removing user ${userId} from occupation ${occupationId}`);

    // Buscar a ocupação com os usuários atuais
    const occupation = await this.occupationRepository.findOne({
      where: { id: occupationId },
      relations: ['users'],
    });

    if (!occupation) {
      throw new OccupationNotFoundException(occupationId);
    }

    // Verificar se o usuário está na ocupação
    const userIndex = occupation.users?.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      throw new UserNotInOccupationException(userId, occupationId);
    }

    // Remover o usuário da ocupação
    occupation.users.splice(userIndex, 1);

    await this.occupationRepository.save(occupation);
  }
}
