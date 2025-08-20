import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Occupation } from '../entities/occupation.entity';
import { CreateOccupationDto } from '../dto/create-occupation.dto';
import { UpdateOccupationDto } from '../dto/update-occupation.dto';

@Injectable()
export class OccupationService {
  constructor(
    @InjectRepository(Occupation)
    private occupationRepository: Repository<Occupation>,
  ) {}

  async create(createOccupationDto: CreateOccupationDto): Promise<Occupation> {
    const occupation = this.occupationRepository.create(createOccupationDto);
    return await this.occupationRepository.save(occupation);
  }

  async findAll(): Promise<Occupation[]> {
    return await this.occupationRepository.find({
      relations: ['users', 'projects', 'tasks'],
    });
  }

  async findOne(id: number): Promise<Occupation> {
    const occupation = await this.occupationRepository.findOne({
      where: { id },
      relations: ['users', 'projects', 'tasks'],
    });
    
    if (!occupation) {
      throw new NotFoundException(`Ocupação com ID ${id} não encontrada`);
    }
    
    return occupation;
  }

  async update(id: number, updateOccupationDto: UpdateOccupationDto): Promise<Occupation> {
    const occupation = await this.findOne(id);
    Object.assign(occupation, updateOccupationDto);
    return await this.occupationRepository.save(occupation);
  }

  async remove(id: number): Promise<void> {
    const occupation = await this.findOne(id);
    await this.occupationRepository.remove(occupation);
  }
}