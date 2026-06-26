import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { OccupationNotFoundException } from '../exceptions/occupation-not-found.exception';
import { Repository } from 'typeorm';
import { OccupationService } from './occupation.service';
import { Occupation } from '../entities/occupation.entity';
import { User } from '../../user/entities/user.entity';
import { CreateOccupationDto } from '../dto/create-occupation.dto';
import { UpdateOccupationDto } from '../dto/update-occupation.dto';

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

describe('OccupationService', () => {
  let service: OccupationService;
  let occupationRepository: MockRepository<Occupation>;
  let userRepository: MockRepository<User>;

  const mockOccupation = {
    id: 1,
    name: 'Developer',
    users: [],
    projects: [],
    tasks: [],
  } as unknown as Occupation;

  beforeEach(async () => {
    occupationRepository = createMockRepository<Occupation>();
    userRepository = createMockRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccupationService,
        {
          provide: getRepositoryToken(Occupation),
          useValue: occupationRepository,
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = module.get<OccupationService>(OccupationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an occupation', async () => {
      occupationRepository.create.mockReturnValue(mockOccupation);
      occupationRepository.save.mockResolvedValue(mockOccupation);

      const dto: CreateOccupationDto = {
        name: 'Developer',
      } as CreateOccupationDto;
      const result = await service.create(dto);

      expect(result).toEqual(mockOccupation);
      expect(occupationRepository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all occupations', async () => {
      occupationRepository.find.mockResolvedValue([mockOccupation]);

      const result = await service.findAll();

      expect(result).toEqual([mockOccupation]);
      expect(occupationRepository.find).toHaveBeenCalledWith({
        relations: ['users', 'projects', 'tasks'],
      });
    });
  });

  describe('findOne', () => {
    it('should return occupation when found', async () => {
      occupationRepository.findOne.mockResolvedValue(mockOccupation);

      const result = await service.findOne(1);

      expect(result).toEqual(mockOccupation);
    });

    it('should throw OccupationNotFoundException when occupation not found', async () => {
      occupationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(OccupationNotFoundException);
    });
  });

  describe('update', () => {
    it('should update occupation', async () => {
      occupationRepository.findOne
        .mockResolvedValueOnce(mockOccupation)
        .mockResolvedValueOnce(null);
      occupationRepository.save.mockResolvedValue({
        ...mockOccupation,
        name: 'Senior Developer',
      });

      const dto: UpdateOccupationDto = {
        name: 'Senior Developer',
      } as UpdateOccupationDto;
      const result = await service.update(1, dto);

      expect(result.name).toBe('Senior Developer');
    });
  });

  describe('remove', () => {
    it('should remove occupation', async () => {
      occupationRepository.findOne.mockResolvedValue(mockOccupation);

      await service.remove(1);

      expect(occupationRepository.remove).toHaveBeenCalledWith(mockOccupation);
    });
  });

  describe('addUserToOccupation', () => {
    it('should add user to occupation', async () => {
      occupationRepository.findOne.mockResolvedValue(mockOccupation);
      userRepository.findOne.mockResolvedValue({ id: 2 } as User);
      occupationRepository.save.mockResolvedValue({
        ...mockOccupation,
        users: [{ id: 2 } as User],
      });

      const result = await service.addUserToOccupation(1, 2);

      expect(result.users).toHaveLength(1);
      expect(occupationRepository.save).toHaveBeenCalled();
    });

    it('should return occupation when user already added', async () => {
      const occupationWithUser = {
        ...mockOccupation,
        users: [{ id: 2 } as User],
      } as Occupation;
      occupationRepository.findOne.mockResolvedValue(occupationWithUser);
      userRepository.findOne.mockResolvedValue({ id: 2 } as User);

      const result = await service.addUserToOccupation(1, 2);

      expect(result.users).toHaveLength(1);
      expect(occupationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeUserFromOccupation', () => {
    it('should remove user from occupation', async () => {
      const occupationWithUser = {
        ...mockOccupation,
        users: [{ id: 2 } as User],
      } as Occupation;
      occupationRepository.findOne.mockResolvedValue(occupationWithUser);

      await service.removeUserFromOccupation(1, 2);

      expect(occupationWithUser.users).toHaveLength(0);
      expect(occupationRepository.save).toHaveBeenCalled();
    });
  });
});
