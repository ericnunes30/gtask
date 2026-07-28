import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OccupationNotFoundException } from '../exceptions/occupation-not-found.exception';
import { DuplicateOccupationNameException } from '../exceptions/duplicate-occupation-name.exception';
import { UserNotInOccupationException } from '../exceptions/user-not-in-occupation.exception';
import { UserNotFoundException } from '../../user/exceptions/user-not-found.exception';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
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

      await expect(service.findOne(999)).rejects.toThrow(
        OccupationNotFoundException,
      );
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

  describe('create error paths', () => {
    it('should throw DuplicateOccupationNameException when name already exists', async () => {
      occupationRepository.findOne.mockResolvedValue(mockOccupation);

      const dto: CreateOccupationDto = {
        name: 'Developer',
      } as CreateOccupationDto;

      await expect(service.create(dto)).rejects.toThrow(
        DuplicateOccupationNameException,
      );
      expect(occupationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll error paths', () => {
    it('should rethrow when repository.find rejects with an Error', async () => {
      const error = new Error('db connection lost');
      occupationRepository.find.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('db connection lost');
    });

    it('should rethrow when repository.find rejects with a non-Error value', async () => {
      occupationRepository.find.mockRejectedValue('string error');

      await expect(service.findAll()).rejects.toBe('string error');
    });
  });

  describe('update error paths', () => {
    it('should throw DuplicateOccupationNameException when renaming to existing name', async () => {
      const existingOccupation = {
        id: 1,
        name: 'Developer',
        users: [],
        projects: [],
        tasks: [],
      } as Occupation;
      occupationRepository.findOne
        .mockResolvedValueOnce(existingOccupation)
        .mockResolvedValueOnce({
          id: 5,
          name: 'Senior Developer',
        } as Occupation);

      const dto: UpdateOccupationDto = {
        name: 'Senior Developer',
      } as UpdateOccupationDto;

      await expect(service.update(1, dto)).rejects.toThrow(
        DuplicateOccupationNameException,
      );
    });

    it('should skip duplicate check when name is unchanged', async () => {
      const existingOccupation = {
        id: 1,
        name: 'Developer',
        users: [],
        projects: [],
        tasks: [],
      } as Occupation;
      occupationRepository.findOne.mockResolvedValue(existingOccupation);
      occupationRepository.save.mockResolvedValue(existingOccupation);

      const dto: UpdateOccupationDto = {
        name: 'Developer',
      } as UpdateOccupationDto;

      const result = await service.update(1, dto);

      expect(occupationRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(existingOccupation);
    });

    it('should skip duplicate check when name is not provided', async () => {
      const existingOccupation = {
        id: 1,
        name: 'Developer',
        users: [],
        projects: [],
        tasks: [],
      } as Occupation;
      occupationRepository.findOne.mockResolvedValue(existingOccupation);
      occupationRepository.save.mockResolvedValue(existingOccupation);

      const dto: UpdateOccupationDto = {} as UpdateOccupationDto;

      const result = await service.update(1, dto);

      expect(occupationRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(existingOccupation);
    });
  });

  describe('addUserToOccupation error paths', () => {
    it('should throw OccupationNotFoundException when occupation does not exist', async () => {
      occupationRepository.findOne.mockResolvedValue(null);

      await expect(service.addUserToOccupation(999, 2)).rejects.toThrow(
        OccupationNotFoundException,
      );
    });

    it('should throw UserNotFoundException when user does not exist', async () => {
      occupationRepository.findOne.mockResolvedValue(mockOccupation);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.addUserToOccupation(1, 999)).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('should initialize users array when occupation.users is undefined', async () => {
      const occupationWithoutUsers = {
        ...mockOccupation,
        users: undefined,
      } as unknown as Occupation;
      occupationRepository.findOne.mockResolvedValue(occupationWithoutUsers);
      userRepository.findOne.mockResolvedValue({ id: 3 } as User);
      occupationRepository.save.mockResolvedValue(occupationWithoutUsers);

      const result = await service.addUserToOccupation(1, 3);

      expect(result.users).toHaveLength(1);
      expect(occupationRepository.save).toHaveBeenCalled();
    });
  });

  describe('removeUserFromOccupation error paths', () => {
    it('should throw OccupationNotFoundException when occupation does not exist', async () => {
      occupationRepository.findOne.mockResolvedValue(null);

      await expect(service.removeUserFromOccupation(999, 2)).rejects.toThrow(
        OccupationNotFoundException,
      );
    });

    it('should throw UserNotInOccupationException when user is not in occupation', async () => {
      const occupationWithoutUser = {
        ...mockOccupation,
        users: [{ id: 5 } as User],
      } as Occupation;
      occupationRepository.findOne.mockResolvedValue(occupationWithoutUser);

      await expect(service.removeUserFromOccupation(1, 999)).rejects.toThrow(
        UserNotInOccupationException,
      );
      expect(occupationRepository.save).not.toHaveBeenCalled();
    });
  });
});
