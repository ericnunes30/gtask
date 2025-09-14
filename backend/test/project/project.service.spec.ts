import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../../src/modules/project/services/project.service';
import { CreateProjectDto } from '../../src/modules/project/dto/create-project.dto';
import { UpdateProjectDto } from '../../src/modules/project/dto/update-project.dto';
import { 
  mockProjectFactory, 
  mockCreateProjectDtoFactory, 
  mockTaskFactory, 
  mockProjectRepository, 
  mockUserRepository, 
  mockOccupationRepository,
  mockUserFactory,
  mockOccupationFactory
} from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';
import { Project } from '../../src/modules/project/entities/project.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums';
import { User } from '../../src/modules/user/entities/user.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { Repository, In } from 'typeorm';

// Mock for ProjectRepository
// Note: Mocks are now defined in factory.ts, so this local definition is redundant and potentially conflicting.
// It should be removed or updated to import from factory.ts if not using a global mock setup.
// For now, assuming we'll use the imported mocks from factory.ts.
// const mockProjectRepository = { ... }; // Removed local mock definition

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: any;
  let userRepository: any;
  let occupationRepository: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: 'ProjectRepository', // Token for ProjectRepository
          useValue: mockProjectRepository,
        },
        {
          provide: 'UserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'OccupationRepository',
          useValue: mockOccupationRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get<any>('ProjectRepository');
    userRepository = module.get<any>('UserRepository');
    occupationRepository = module.get<any>('OccupationRepository');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project without users and teams', async () => {
      const createProjectDto: CreateProjectDto = mockCreateProjectDtoFactory();
      const createdProject = mockProjectFactory({ ...createProjectDto, id: 1 });

      (projectRepository.create as jest.Mock).mockReturnValue(createdProject);
      (projectRepository.save as jest.Mock).mockResolvedValue(createdProject);

      const result = await service.create(createProjectDto);
      expect(result).toEqual(createdProject);
      expect(projectRepository.create).toHaveBeenCalledWith(createProjectDto);
      expect(projectRepository.save).toHaveBeenCalledWith(createdProject);
    });

    it('should create a new project with users', async () => {
      const createProjectDto: CreateProjectDto = mockCreateProjectDtoFactory({
        users: [1, 2]
      });
      const createdProject = mockProjectFactory({ ...createProjectDto, id: 1 });
      const mockUsers = [
        mockUserFactory({ id: 1 }),
        mockUserFactory({ id: 2 })
      ];

      (projectRepository.create as jest.Mock).mockReturnValue(createdProject);
      (projectRepository.save as jest.Mock)
        .mockResolvedValueOnce(createdProject)
        .mockResolvedValueOnce({ ...createdProject, users: mockUsers });
      (userRepository.find as jest.Mock).mockResolvedValue(mockUsers);

      const result = await service.create(createProjectDto);
      expect(result).toEqual({ ...createdProject, users: mockUsers });
      expect(projectRepository.create).toHaveBeenCalledWith({
        title: createProjectDto.title,
        description: createProjectDto.description,
        status: createProjectDto.status,
        priority: createProjectDto.priority,
        start_date: createProjectDto.start_date,
        end_date: createProjectDto.end_date
      });
      expect(userRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(projectRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should create a new project with teams', async () => {
      const createProjectDto: CreateProjectDto = mockCreateProjectDtoFactory({
        teams: [1, 2]
      });
      const createdProject = mockProjectFactory({ ...createProjectDto, id: 1 });
      const mockOccupations = [
        mockOccupationFactory({ id: 1 }),
        mockOccupationFactory({ id: 2 })
      ];

      (projectRepository.create as jest.Mock).mockReturnValue(createdProject);
      (projectRepository.save as jest.Mock).mockResolvedValueOnce(createdProject);
      (occupationRepository.find as jest.Mock).mockResolvedValue(mockOccupations);
      (projectRepository.save as jest.Mock).mockResolvedValueOnce(createdProject);

      const result = await service.create(createProjectDto);
      expect(result).toEqual(createdProject);
      expect(occupationRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(projectRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should create a new project with users and teams', async () => {
      const createProjectDto: CreateProjectDto = mockCreateProjectDtoFactory({
        users: [1, 2],
        teams: [1, 2]
      });
      const createdProject = mockProjectFactory({ ...createProjectDto, id: 1 });
      const mockUsers = [
        mockUserFactory({ id: 1 }),
        mockUserFactory({ id: 2 })
      ];
      const mockOccupations = [
        mockOccupationFactory({ id: 1 }),
        mockOccupationFactory({ id: 2 })
      ];

      (projectRepository.create as jest.Mock).mockReturnValue(createdProject);
      (projectRepository.save as jest.Mock)
        .mockResolvedValueOnce(createdProject)
        .mockResolvedValueOnce({ ...createdProject, users: mockUsers, occupations: mockOccupations });
      (userRepository.find as jest.Mock).mockResolvedValue(mockUsers);
      (occupationRepository.find as jest.Mock).mockResolvedValue(mockOccupations);

      const result = await service.create(createProjectDto);
      expect(result).toEqual({ ...createdProject, users: mockUsers, occupations: mockOccupations });
      expect(userRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(occupationRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
      expect(projectRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('should return an array of projects with all relations', async () => {
      const projects: Project[] = [
        mockProjectFactory({ 
          id: 1, 
          title: 'Project 1',
          tasks: [mockTaskFactory()],
          users: [mockUserFactory()],
          occupations: [mockOccupationFactory()]
        }),
        mockProjectFactory({ 
          id: 2, 
          title: 'Project 2',
          tasks: [mockTaskFactory({ id: 2 })],
          users: [mockUserFactory({ id: 2 })],
          occupations: [mockOccupationFactory({ id: 2 })]
        })
      ];
      
      (projectRepository.find as jest.Mock).mockResolvedValue(projects);

      const result = await service.findAll();
      expect(result).toEqual(projects);
      expect(projectRepository.find).toHaveBeenCalledWith({
        relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a project if found with all relations', async () => {
      const project = mockProjectFactory({
        tasks: [mockTaskFactory()],
        users: [mockUserFactory()],
        occupations: [mockOccupationFactory()]
      });
      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);

      const result = await service.findOne(project.id);
      expect(result).toEqual(project);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: project.id },
        relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
      });
    });

    it('should throw NotFoundException if project is not found', async () => {
      const projectId = 999;
      (projectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(projectId)).rejects.toThrow(NotFoundException);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
      });
    });
  });

  describe('update', () => {
    it('should update basic project fields', async () => {
      const project = mockProjectFactory();
      const updateProjectDto: UpdateProjectDto = { title: 'Updated Project Title' };
      const updatedProject = mockProjectFactory({ ...project, ...updateProjectDto });

      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);
      (projectRepository.save as jest.Mock).mockResolvedValue(updatedProject);

      const result = await service.update(project.id, updateProjectDto);
      expect(result).toEqual(updatedProject);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: project.id },
        relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
      });
      expect(projectRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateProjectDto));
    });

    it('should update project with new users', async () => {
      const project = mockProjectFactory();
      const updateProjectDto: UpdateProjectDto = { users: [1, 2] };
      const updatedProject = mockProjectFactory({ ...project, ...updateProjectDto });
      const mockUsers = [
        mockUserFactory({ id: 1 }),
        mockUserFactory({ id: 2 })
      ];

      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);
      (userRepository.find as jest.Mock).mockResolvedValue(mockUsers);
      (projectRepository.save as jest.Mock).mockResolvedValue(updatedProject);

      const result = await service.update(project.id, updateProjectDto);
      expect(result).toEqual(updatedProject);
      expect(userRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
    });

    it('should update project by removing all users', async () => {
      const project = mockProjectFactory();
      const updateProjectDto: UpdateProjectDto = { users: [] };
      const updatedProject = mockProjectFactory({ ...project, users: [] });

      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);
      (projectRepository.save as jest.Mock).mockResolvedValue(updatedProject);

      const result = await service.update(project.id, updateProjectDto);
      expect(result).toEqual(updatedProject);
      expect(projectRepository.save).toHaveBeenCalledWith(expect.objectContaining({ users: [] }));
    });

    it('should update project with new teams', async () => {
      const project = mockProjectFactory();
      const updateProjectDto: UpdateProjectDto = { teams: [1, 2] };
      const updatedProject = mockProjectFactory({ ...project, ...updateProjectDto });
      const mockOccupations = [
        mockOccupationFactory({ id: 1 }),
        mockOccupationFactory({ id: 2 })
      ];

      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);
      (occupationRepository.find as jest.Mock).mockResolvedValue(mockOccupations);
      (projectRepository.save as jest.Mock).mockResolvedValue(updatedProject);

      const result = await service.update(project.id, updateProjectDto);
      expect(result).toEqual(updatedProject);
      expect(occupationRepository.find).toHaveBeenCalledWith({ where: { id: In([1, 2]) } });
    });

    it('should update project by removing all teams', async () => {
      const project = mockProjectFactory();
      const updateProjectDto: UpdateProjectDto = { teams: [] };
      const updatedProject = mockProjectFactory({ ...project, occupations: [] });

      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);
      (projectRepository.save as jest.Mock).mockResolvedValue(updatedProject);

      const result = await service.update(project.id, updateProjectDto);
      expect(result).toEqual(updatedProject);
      expect(projectRepository.save).toHaveBeenCalledWith(expect.objectContaining({ occupations: [] }));
    });

    it('should throw NotFoundException if project is not found', async () => {
      const projectId = 999;
      const updateProjectDto: UpdateProjectDto = { title: 'Updated Project Title' };
      (projectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(projectId, updateProjectDto)).rejects.toThrow(NotFoundException);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
      });
      expect(projectRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a project if found', async () => {
      const project = mockProjectFactory();
      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);
      (projectRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await service.remove(project.id);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: project.id },
        relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
      });
      expect(projectRepository.remove).toHaveBeenCalledWith(project);
    });

    it('should throw NotFoundException if project is not found', async () => {
      const projectId = 999;
      (projectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(projectId)).rejects.toThrow(NotFoundException);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'tasks.users', 'tasks.occupations', 'users', 'occupations'],
      });
      expect(projectRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findProjectTasks', () => {
    it('should return tasks for a given project', async () => {
      const projectId = 1;
      const tasks: Task[] = [mockTaskFactory({ project_id: projectId }), mockTaskFactory({ id: 2, project_id: projectId })];
      const project = mockProjectFactory({ 
        id: projectId, 
        tasks: tasks,
        users: [mockUserFactory()],
        occupations: [mockOccupationFactory()]
      });
      
      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);

      const result = await service.findProjectTasks(projectId);
      expect(result).toEqual(tasks);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'tasks.users', 'tasks.occupations'],
      });
    });

    it('should throw NotFoundException if project is not found', async () => {
      const projectId = 999;
      (projectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findProjectTasks(projectId)).rejects.toThrow(NotFoundException);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'tasks.users', 'tasks.occupations'],
      });
    });

    it('should return empty array when project has no tasks', async () => {
      const projectId = 1;
      const project = mockProjectFactory({ 
        id: projectId, 
        tasks: []
      });
      
      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);

      const result = await service.findProjectTasks(projectId);
      expect(result).toEqual([]);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'tasks.users', 'tasks.occupations'],
      });
    });
  });
});