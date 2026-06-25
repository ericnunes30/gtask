import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { ProjectService } from './project.service';
import { Project } from '../entities/project.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Task } from '../../tasks/entities/task.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

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

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: MockRepository<Project>;
  let userRepository: MockRepository<User>;
  let occupationRepository: MockRepository<Occupation>;
  let taskRepository: MockRepository<Task>;

  const mockProject = {
    id: 1,
    name: 'Project Alpha',
    description: 'Desc',
    users: [],
    occupations: [],
  } as unknown as Project;

  beforeEach(async () => {
    projectRepository = createMockRepository<Project>();
    userRepository = createMockRepository<User>();
    occupationRepository = createMockRepository<Occupation>();
    taskRepository = createMockRepository<Task>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project), useValue: projectRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(Occupation),
          useValue: occupationRepository,
        },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a project with basic data', async () => {
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);

      const dto: CreateProjectDto = {
        name: mockProject.name,
        description: mockProject.description,
        users: [],
        teams: [],
      } as CreateProjectDto;

      const result = await service.create(dto);

      expect(result).toEqual(mockProject);
      expect(projectRepository.create).toHaveBeenCalledWith({
        name: mockProject.name,
        description: mockProject.description,
      });
    });

    it('should associate users and occupations when provided', async () => {
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      userRepository.find.mockResolvedValue([
        { id: 1 } as User,
        { id: 2 } as User,
      ]);
      occupationRepository.find.mockResolvedValue([{ id: 10 } as Occupation]);

      const dto: CreateProjectDto = {
        name: 'Project Alpha',
        users: [1, 2],
        teams: [10],
      } as CreateProjectDto;

      await service.create(dto);

      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: In([1, 2]) },
      });
      expect(occupationRepository.find).toHaveBeenCalledWith({
        where: { id: In([10]) },
      });
    });
  });

  describe('findOne', () => {
    it('should return project when found', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne(1);

      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update project and clear users when empty array provided', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);

      const dto: UpdateProjectDto = {
        name: 'Updated',
        users: [],
      } as UpdateProjectDto;

      const result = await service.update(1, dto);

      expect(result.name).toBe('Updated');
      expect(mockProject.users).toEqual([]);
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, {} as UpdateProjectDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete tasks and remove project', async () => {
      const projectWithTasks = {
        ...mockProject,
        tasks: [{ id: 1 } as Task],
      } as Project;
      projectRepository.findOne.mockResolvedValue(projectWithTasks);
      projectRepository.remove.mockResolvedValue(projectWithTasks);
      taskRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.remove(1);

      expect(taskRepository.delete).toHaveBeenCalledWith({ project_id: 1 });
      expect(projectRepository.remove).toHaveBeenCalledWith(projectWithTasks);
    });
  });
});
