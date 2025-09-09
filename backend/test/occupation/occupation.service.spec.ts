import { Test, TestingModule } from '@nestjs/testing';
import { OccupationService } from '../../src/modules/occupation/services/occupation.service';
import { CreateOccupationDto } from '../../src/modules/occupation/dto/create-occupation.dto';
import { UpdateOccupationDto } from '../../src/modules/occupation/dto/update-occupation.dto';
// Correcting imports based on the factory file content
import { mockOccupationFactory, mockCreateOccupationDtoFactory, mockTaskFactory } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { User } from '../../src/modules/user/entities/user.entity';
import { Project } from '../../src/modules/project/entities/project.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';

// Mock for OccupationRepository
const mockOccupationRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('OccupationService', () => {
  let service: OccupationService;
  let occupationRepository: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccupationService,
        {
          provide: 'OccupationRepository', // Token for OccupationRepository
          useValue: mockOccupationRepository,
        },
      ],
    }).compile();

    service = module.get<OccupationService>(OccupationService);
    occupationRepository = module.get<any>('OccupationRepository');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new occupation', async () => {
      const createOccupationDto: CreateOccupationDto = mockCreateOccupationDtoFactory();
      const createdOccupation = mockOccupationFactory({ ...createOccupationDto, id: 1 });

      (occupationRepository.create as jest.Mock).mockReturnValue(createdOccupation);
      (occupationRepository.save as jest.Mock).mockResolvedValue(createdOccupation);

      const result = await service.create(createOccupationDto);
      expect(result).toEqual(createdOccupation); // Corrected typo: createdOperation -> createdOccupation
      expect(occupationRepository.create).toHaveBeenCalledWith(createOccupationDto);
      expect(occupationRepository.save).toHaveBeenCalledWith(createdOccupation);
    });
  });

  describe('findAll', () => {
    it('should return an array of occupations', async () => {
      const occupations: Occupation[] = [
        mockOccupationFactory(),
        mockOccupationFactory({ id: 2, name: 'Another Occupation' }),
      ];
      (occupationRepository.find as jest.Mock).mockResolvedValue(occupations);

      const result = await service.findAll();
      expect(result).toEqual(occupations);
      expect(occupationRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return an occupation if found', async () => {
      const occupation = mockOccupationFactory();
      (occupationRepository.findOne as jest.Mock).mockResolvedValue(occupation);

      const result = await service.findOne(occupation.id);
      expect(result).toEqual(occupation);
      // Ensure relations are correctly specified in the findOne call
      expect(occupationRepository.findOne).toHaveBeenCalledWith({ where: { id: occupation.id }, relations: ['users', 'projects', 'tasks'] });
    });

    it('should throw NotFoundException if occupation is not found', async () => {
      const occupationId = 999;
      (occupationRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(occupationId)).rejects.toThrow(NotFoundException);
      expect(occupationRepository.findOne).toHaveBeenCalledWith({ where: { id: occupationId }, relations: ['users', 'projects', 'tasks'] });
    });
  });

  describe('update', () => {
    it('should update an occupation if found', async () => {
      const occupation = mockOccupationFactory();
      const updateOccupationDto: UpdateOccupationDto = { name: 'Updated Occupation Name' };
      const updatedOccupation = mockOccupationFactory({ ...occupation, ...updateOccupationDto });

      // Mocking findOne to return the existing occupation
      (occupationRepository.findOne as jest.Mock).mockResolvedValue(occupation);
      // Mocking save to return the updated occupation
      (occupationRepository.save as jest.Mock).mockResolvedValue(updatedOccupation);

      const result = await service.update(occupation.id, updateOccupationDto);
      expect(result).toEqual(updatedOccupation);
      expect(occupationRepository.findOne).toHaveBeenCalledWith({ where: { id: occupation.id }, relations: ['users', 'projects', 'tasks'] });
      // The update method in the service calls findOne and then save.
      // We expect save to be called with the modified occupation object.
      expect(occupationRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateOccupationDto));
    });

    it('should throw NotFoundException if occupation is not found', async () => {
      const occupationId = 999;
      const updateOccupationDto: UpdateOccupationDto = { name: 'Updated Occupation Name' };
      (occupationRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(occupationId, updateOccupationDto)).rejects.toThrow(NotFoundException);
      expect(occupationRepository.findOne).toHaveBeenCalledWith({ where: { id: occupationId }, relations: ['users', 'projects', 'tasks'] });
      expect(occupationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove an occupation if found', async () => {
      const occupation = mockOccupationFactory();
      (occupationRepository.findOne as jest.Mock).mockResolvedValue(occupation);
      (occupationRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.remove(occupation.id);
      expect(occupationRepository.findOne).toHaveBeenCalledWith({ where: { id: occupation.id }, relations: ['users', 'projects', 'tasks'] });
      expect(occupationRepository.remove).toHaveBeenCalledWith(occupation);
    });

    it('should throw NotFoundException if occupation is not found', async () => {
      const occupationId = 999;
      (occupationRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(occupationId)).rejects.toThrow(NotFoundException);
      expect(occupationRepository.findOne).toHaveBeenCalledWith({ where: { id: occupationId }, relations: ['users', 'projects', 'tasks'] });
      expect(occupationRepository.remove).not.toHaveBeenCalled();
    });
  });
});