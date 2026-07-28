import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, In } from 'typeorm';
import { ProjectService } from './project.service';
import { Project } from '../entities/project.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Task } from '../../tasks/entities/task.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectNotFoundException } from '../exceptions/project-not-found.exception';
import { RelatedUsersNotFoundException } from '../exceptions/related-users-not-found.exception';
import { RelatedOccupationsNotFoundException } from '../exceptions/related-occupations-not-found.exception';

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
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
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

    it('should skip task deletion when project has no tasks', async () => {
      const projectWithoutTasks = {
        ...mockProject,
        tasks: [],
      } as Project;
      projectRepository.findOne.mockResolvedValue(projectWithoutTasks);
      projectRepository.remove.mockResolvedValue(projectWithoutTasks);

      await service.remove(1);

      expect(taskRepository.delete).not.toHaveBeenCalled();
      expect(projectRepository.remove).toHaveBeenCalledWith(
        projectWithoutTasks,
      );
    });
  });

  describe('create error paths', () => {
    it('should throw RelatedUsersNotFoundException when a user is missing', async () => {
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      userRepository.find.mockResolvedValue([{ id: 1 } as User]);

      const dto: CreateProjectDto = {
        name: 'Project Alpha',
        users: [1, 2],
        teams: [],
      } as CreateProjectDto;

      await expect(service.create(dto)).rejects.toThrow(
        RelatedUsersNotFoundException,
      );
    });

    it('should throw RelatedOccupationsNotFoundException when an occupation is missing', async () => {
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      occupationRepository.find.mockResolvedValue([]);

      const dto: CreateProjectDto = {
        name: 'Project Alpha',
        users: [],
        teams: [10],
      } as CreateProjectDto;

      await expect(service.create(dto)).rejects.toThrow(
        RelatedOccupationsNotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all projects with relations', async () => {
      projectRepository.find.mockResolvedValue([mockProject]);

      const result = await service.findAll();

      expect(result).toEqual([mockProject]);
      expect(projectRepository.find).toHaveBeenCalledWith({
        relations: [
          'tasks',
          'tasks.users',
          'tasks.occupations',
          'users',
          'occupations',
        ],
      });
    });
  });

  describe('update error paths', () => {
    it('should throw RelatedUsersNotFoundException when a user is missing', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.find.mockResolvedValue([]);

      const dto: UpdateProjectDto = {
        users: [1, 2],
      } as UpdateProjectDto;

      await expect(service.update(1, dto)).rejects.toThrow(
        RelatedUsersNotFoundException,
      );
    });

    it('should associate occupations when teams are provided', async () => {
      const occupation = { id: 10 } as Occupation;
      projectRepository.findOne.mockResolvedValue(mockProject);
      occupationRepository.find.mockResolvedValue([occupation]);
      projectRepository.save.mockResolvedValue(mockProject);

      const dto: UpdateProjectDto = {
        teams: [10],
      } as UpdateProjectDto;

      await service.update(1, dto);

      expect(occupationRepository.find).toHaveBeenCalledWith({
        where: { id: In([10]) },
      });
      expect(mockProject.occupations).toEqual([occupation]);
    });

    it('should clear occupations when empty teams array is provided', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);

      const dto: UpdateProjectDto = {
        teams: [],
      } as UpdateProjectDto;

      await service.update(1, dto);

      expect(mockProject.occupations).toEqual([]);
      expect(occupationRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findProjectTasks', () => {
    it('should return project tasks when project exists', async () => {
      const tasks = [{ id: 1 } as Task, { id: 2 } as Task];
      const projectWithTasks = {
        ...mockProject,
        tasks,
      } as Project;
      projectRepository.findOne.mockResolvedValue(projectWithTasks);

      const result = await service.findProjectTasks(1);

      expect(result).toEqual(tasks);
    });

    it('should throw ProjectNotFoundException when project does not exist', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.findProjectTasks(999)).rejects.toThrow(
        ProjectNotFoundException,
      );
    });
  });
});
