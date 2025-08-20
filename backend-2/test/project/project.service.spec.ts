import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../../src/modules/project/services/project.service';
import { CreateProjectDto } from '../../src/modules/project/dto/create-project.dto';
import { UpdateProjectDto } from '../../src/modules/project/dto/update-project.dto';
// Correcting imports based on the factory file content which now includes these mocks
import { mockProjectFactory, mockCreateProjectDtoFactory, mockTaskFactory, mockProjectRepository } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';
import { Project } from '../../src/modules/project/entities/project.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums'; // Import PriorityLevel enum

// Mock for ProjectRepository
// Note: Mocks are now defined in factory.ts, so this local definition is redundant and potentially conflicting.
// It should be removed or updated to import from factory.ts if not using a global mock setup.
// For now, assuming we'll use the imported mocks from factory.ts.
// const mockProjectRepository = { ... }; // Removed local mock definition

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: 'ProjectRepository', // Token for ProjectRepository
          useValue: mockProjectRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get<any>('ProjectRepository');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createProjectDto: CreateProjectDto = mockCreateProjectDtoFactory();
      const createdProject = mockProjectFactory({ ...createProjectDto, id: 1 });

      (projectRepository.create as jest.Mock).mockReturnValue(createdProject);
      (projectRepository.save as jest.Mock).mockResolvedValue(createdProject);

      const result = await service.create(createProjectDto);
      expect(result).toEqual(createdProject);
      expect(projectRepository.create).toHaveBeenCalledWith(createProjectDto);
      expect(projectRepository.save).toHaveBeenCalledWith(createdProject);
    });
  });

  describe('findAll', () => {
    it('should return an array of projects', async () => {
      const projects: Project[] = [mockProjectFactory(), mockProjectFactory({ id: 2, title: 'Another Project' })];
      (projectRepository.find as jest.Mock).mockResolvedValue(projects);

      const result = await service.findAll();
      expect(result).toEqual(projects);
      expect(projectRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a project if found', async () => {
      const project = mockProjectFactory();
      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);

      const result = await service.findOne(project.id);
      expect(result).toEqual(project);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: project.id },
        relations: ['tasks', 'users', 'occupations'], // Corrected relations
      });
    });

    it('should throw NotFoundException if project is not found', async () => {
      const projectId = 999;
      (projectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(projectId)).rejects.toThrow(NotFoundException);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'users', 'occupations'], // Corrected relations
      });
    });
  });

  describe('update', () => {
    it('should update a project if found', async () => {
      const project = mockProjectFactory();
      const updateProjectDto: UpdateProjectDto = { title: 'Updated Project Title' };
      const updatedProject = mockProjectFactory({ ...project, ...updateProjectDto });

      (projectRepository.findOne as jest.Mock).mockResolvedValue(project);
      (projectRepository.save as jest.Mock).mockResolvedValue(updatedProject);

      const result = await service.update(project.id, updateProjectDto);
      expect(result).toEqual(updatedProject);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: project.id },
        relations: ['tasks', 'users', 'occupations'], // Corrected relations
      });
      expect(projectRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateProjectDto));
    });

    it('should throw NotFoundException if project is not found', async () => {
      const projectId = 999;
      const updateProjectDto: UpdateProjectDto = { title: 'Updated Project Title' };
      (projectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(projectId, updateProjectDto)).rejects.toThrow(NotFoundException);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'users', 'occupations'], // Corrected relations
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
        relations: ['tasks', 'users', 'occupations'], // Corrected relations
      });
      expect(projectRepository.remove).toHaveBeenCalledWith(project);
    });

    it('should throw NotFoundException if project is not found', async () => {
      const projectId = 999;
      (projectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(projectId)).rejects.toThrow(NotFoundException);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'users', 'occupations'], // Corrected relations
      });
      expect(projectRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findProjectTasks', () => {
    it('should return tasks for a given project', async () => {
      const projectId = 1;
      // Corrected property name from projectId to project_id
      const tasks: Task[] = [mockTaskFactory({ project_id: projectId }), mockTaskFactory({ id: 2, project_id: projectId })];
      
      // Mocking the repository method to return tasks
      (projectRepository.findOne as jest.Mock).mockResolvedValue(mockProjectFactory({ id: projectId, tasks: tasks })); // Mock findOne to return the project with tasks

      const result = await service.findProjectTasks(projectId);
      expect(result).toEqual(tasks);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
        relations: ['tasks', 'tasks.users', 'tasks.occupations'],
      });
    });
  });
});