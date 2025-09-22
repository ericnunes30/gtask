import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from '../../src/modules/project/controllers/project.controller';
import { ProjectService } from '../../src/modules/project/services/project.service';
import { CreateProjectDto } from '../../src/modules/project/dto/create-project.dto';
import { UpdateProjectDto } from '../../src/modules/project/dto/update-project.dto';
import { mockProjectFactory, mockCreateProjectDtoFactory, mockTaskFactory } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';
import { Project } from '../../src/modules/project/entities/project.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findProjectTasks: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createProjectDto: CreateProjectDto = mockCreateProjectDtoFactory();
      const createdProject = mockProjectFactory({ ...createProjectDto, id: 1 });

      (service.create as jest.Mock).mockResolvedValue(createdProject);

      const result = await controller.create(createProjectDto);
      expect(result).toEqual(createdProject);
      expect(service.create).toHaveBeenCalledWith(createProjectDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of projects', async () => {
      const projects: Project[] = [
        mockProjectFactory({ id: 1, title: 'Project 1' }),
        mockProjectFactory({ id: 2, title: 'Project 2' }),
      ];

      (service.findAll as jest.Mock).mockResolvedValue(projects);

      const result = await controller.findAll();
      expect(result).toEqual(projects);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a project if found', async () => {
      const project = mockProjectFactory();
      (service.findOne as jest.Mock).mockResolvedValue(project);

      const result = await controller.findOne('1');
      expect(result).toEqual(project);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if project is not found', async () => {
      (service.findOne as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(999);
    });

    it('should handle invalid ID format', async () => {
      await expect(controller.findOne('invalid')).rejects.toThrow();
      expect(service.findOne).toHaveBeenCalledWith(NaN);
    });
  });

  describe('update', () => {
    it('should update a project if found', async () => {
      const projectId = '1';
      const updateProjectDto: UpdateProjectDto = { title: 'Updated Project Title' };
      const updatedProject = mockProjectFactory({ id: 1, ...updateProjectDto });

      (service.update as jest.Mock).mockResolvedValue(updatedProject);

      const result = await controller.update(projectId, updateProjectDto);
      expect(result).toEqual(updatedProject);
      expect(service.update).toHaveBeenCalledWith(1, updateProjectDto);
    });

    it('should throw NotFoundException if project is not found', async () => {
      (service.update as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.update('999', { title: 'Updated Title' })).rejects.toThrow(NotFoundException);
      expect(service.update).toHaveBeenCalledWith(999, { title: 'Updated Title' });
    });

    it('should handle invalid ID format', async () => {
      await expect(controller.update('invalid', { title: 'Updated Title' })).rejects.toThrow();
      expect(service.update).toHaveBeenCalledWith(NaN, { title: 'Updated Title' });
    });
  });

  describe('remove', () => {
    it('should remove a project if found', async () => {
      (service.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if project is not found', async () => {
      (service.remove as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.remove('999')).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledWith(999);
    });

    it('should handle invalid ID format', async () => {
      await expect(controller.remove('invalid')).rejects.toThrow();
      expect(service.remove).toHaveBeenCalledWith(NaN);
    });
  });

  describe('findProjectTasks', () => {
    it('should return tasks for a given project', async () => {
      const projectId = '1';
      const tasks: Task[] = [
        mockTaskFactory({ project_id: 1 }),
        mockTaskFactory({ id: 2, project_id: 1 }),
      ];

      (service.findProjectTasks as jest.Mock).mockResolvedValue(tasks);

      const result = await controller.findProjectTasks(projectId);
      expect(result).toEqual(tasks);
      expect(service.findProjectTasks).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if project is not found', async () => {
      (service.findProjectTasks as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.findProjectTasks('999')).rejects.toThrow(NotFoundException);
      expect(service.findProjectTasks).toHaveBeenCalledWith(999);
    });

    it('should handle invalid ID format', async () => {
      await expect(controller.findProjectTasks('invalid')).rejects.toThrow();
      expect(service.findProjectTasks).toHaveBeenCalledWith(NaN);
    });

    it('should return empty array when project has no tasks', async () => {
      (service.findProjectTasks as jest.Mock).mockResolvedValue([]);

      const result = await controller.findProjectTasks('1');
      expect(result).toEqual([]);
      expect(service.findProjectTasks).toHaveBeenCalledWith(1);
    });
  });

  describe('edge cases', () => {
    it('should handle large project ID numbers', async () => {
      const largeId = '2147483647'; // Max 32-bit signed integer
      const project = mockProjectFactory({ id: 2147483647 });

      (service.findOne as jest.Mock).mockResolvedValue(project);

      const result = await controller.findOne(largeId);
      expect(result).toEqual(project);
      expect(service.findOne).toHaveBeenCalledWith(2147483647);
    });

    it('should handle zero project ID', async () => {
      await expect(controller.findOne('0')).rejects.toThrow();
      expect(service.findOne).toHaveBeenCalledWith(0);
    });

    it('should handle negative project ID', async () => {
      await expect(controller.findOne('-1')).rejects.toThrow();
      expect(service.findOne).toHaveBeenCalledWith(-1);
    });

    it('should handle empty string project ID', async () => {
      await expect(controller.findOne('')).rejects.toThrow();
      expect(service.findOne).toHaveBeenCalledWith(NaN);
    });
  });
});