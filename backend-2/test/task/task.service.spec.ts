import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../../src/modules/tasks/services/task.service';
// Attempting to correct the import path for TaskRepository. Common locations include:
// - '../../src/modules/tasks/repositories/task.repository'
// - '../../src/modules/tasks/typeorm/task.repository'
// - '../../src/modules/tasks/task.provider'
// - Directly from the entity if using TypeORM's default repository pattern.
// For now, assuming it's a file within the tasks module.
// If this path is incorrect, further investigation or user input will be needed.
// Based on the file list, 'task.module.ts' is in the tasks directory. NestJS often
// registers repositories via the module or a dedicated provider file.
// Let's assume 'TaskRepository' is provided by the module as a token.
import { mockTaskFactory, mockCreateTaskDtoFactory, mockTaskRepository } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { User } from '../../src/modules/user/entities/user.entity'; // Added import for User entity
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../../src/modules/tasks/dto/update-task.dto';
import { Status } from '../../src/modules/tasks/entities/enums'; // Import Status enum

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: any; // Use 'any' for the mocked repository to avoid type issues if TaskRepository file is not found

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          // NestJS typically injects repositories via a token.
          // If TaskRepository is a TypeORM repository, it might be provided as 'DataSource.getRepository(Task)'
          // or a custom token. For mocking purposes, we'll use a common token like 'TaskRepository'.
          // If the actual provider token is different, this will need adjustment.
          provide: 'TaskRepository',
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get<any>('TaskRepository'); // Get the mocked repository using the token
  });

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory();
      const createdTask = mockTaskFactory({ ...createTaskDto, id: 1 });

      // Mock the repository's create and save methods
      (taskRepository.create as jest.Mock).mockReturnValue(createdTask);
      (taskRepository.save as jest.Mock).mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto);
      expect(result).toEqual(createdTask);
      expect(taskRepository.create).toHaveBeenCalledWith(createTaskDto);
      expect(taskRepository.save).toHaveBeenCalledWith(createdTask);
    });
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const tasks: Task[] = [mockTaskFactory(), mockTaskFactory({ id: 2, title: 'Another Task' })];
      (taskRepository.findAll as jest.Mock).mockResolvedValue(tasks);

      const result = await service.findAll();
      expect(result).toEqual(tasks);
      expect(taskRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a task if found', async () => {
      const task = mockTaskFactory();
      (taskRepository.findOne as jest.Mock).mockResolvedValue(task);

      const result = await service.findOne(task.id);
      expect(result).toEqual(task);
      expect(taskRepository.findOne).toHaveBeenCalledWith({ where: { id: task.id } });
    });

    it('should throw NotFoundException if task is not found', async () => {
      const taskId = 999;
      (taskRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(taskId)).rejects.toThrow(NotFoundException);
      expect(taskRepository.findOne).toHaveBeenCalledWith({ where: { id: taskId } });
    });
  });

  describe('update', () => {
    it('should update a task if found', async () => {
      const task = mockTaskFactory();
      // Corrected status to use the enum and ensured property names match entity
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task Title', status: Status.InProgress };
      const updatedTask = mockTaskFactory({ ...task, ...updateTaskDto });

      (taskRepository.findOne as jest.Mock).mockResolvedValue(task);
      // Mocking update to return the updated data, then finding the fully updated task
      (taskRepository.update as jest.Mock).mockResolvedValue({ ...task, ...updateTaskDto });
      (taskRepository.findOne as jest.Mock).mockResolvedValue(updatedTask);

      const result = await service.update(task.id, updateTaskDto as any); // Cast to any for simplicity if UpdateTaskDto is partial
      expect(result).toEqual(updatedTask);
      expect(taskRepository.findOne).toHaveBeenCalledWith({ where: { id: task.id } });
      expect(taskRepository.update).toHaveBeenCalledWith(task.id, updateTaskDto);
    });

    it('should throw NotFoundException if task is not found', async () => {
      const taskId = 999;
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task Title' };
      (taskRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(taskId, updateTaskDto as any)).rejects.toThrow(NotFoundException);
      expect(taskRepository.findOne).toHaveBeenCalledWith({ where: { id: taskId } });
      expect(taskRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a task if found', async () => {
      const task = mockTaskFactory();
      (taskRepository.findOne as jest.Mock).mockResolvedValue(task);
      (taskRepository.remove as jest.Mock).mockResolvedValue(undefined); // remove usually returns void or the removed entity

      await service.remove(task.id);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: task.id },
        relations: ['project', 'reviewer', 'users', 'occupations']
      });
      expect(taskRepository.remove).toHaveBeenCalledWith(task);
    });

    it('should throw NotFoundException if task is not found', async () => {
      const taskId = 999;
      (taskRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(taskId)).rejects.toThrow(NotFoundException);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
        relations: ['project', 'reviewer', 'users', 'occupations']
      });
      expect(taskRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findByProject', () => {
    it('should return tasks for a given project', async () => {
      const projectId = 1;
      // Corrected property name from projectId to project_id
      const tasks: Task[] = [mockTaskFactory({ project_id: projectId }), mockTaskFactory({ id: 2, project_id: projectId })];
      (taskRepository.find as jest.Mock).mockResolvedValue(tasks);

      const result = await service.findByProject(projectId);
      expect(result).toEqual(tasks);
      // Corrected property name in mock call
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { project_id: projectId },
        relations: ['project', 'reviewer', 'users', 'occupations']
      });
    });
  });

  describe('findByStatus', () => {
    it('should return tasks for a given status', async () => {
      const status = Status.InProgress; // Corrected to use enum
      const tasks: Task[] = [mockTaskFactory({ status: status }), mockTaskFactory({ id: 2, status: status })];
      (taskRepository.find as jest.Mock).mockResolvedValue(tasks);

      const result = await service.findByStatus(status);
      expect(result).toEqual(tasks);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { status: status },
        relations: ['project', 'reviewer', 'users', 'occupations']
      });
    });
  });

  describe('updateTimer', () => {
    it('should update the timer for a task', async () => {
      const task = mockTaskFactory();
      const timerValue = 1200; // e.g., 20 minutes in seconds
      const updatedTask = mockTaskFactory({ ...task, timer: timerValue });

      (taskRepository.findOne as jest.Mock).mockResolvedValue(task);
      (taskRepository.update as jest.Mock).mockResolvedValue({ ...task, timer: timerValue });
      (taskRepository.findOne as jest.Mock).mockResolvedValue(updatedTask);

      const result = await service.updateTimer(task.id, timerValue);
      expect(result).toEqual(updatedTask);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: task.id },
        relations: ['project', 'reviewer', 'users', 'occupations']
      });
      expect(taskRepository.update).toHaveBeenCalledWith(task.id, { timer: timerValue });
    });

    it('should throw NotFoundException if task is not found for timer update', async () => {
      const taskId = 999;
      const timerValue = 1200;
      (taskRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateTimer(taskId, timerValue)).rejects.toThrow(NotFoundException);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
        relations: ['users'] // Corrected relations for assignUsers
      });
      expect(taskRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('assignUsers', () => {
    it('should assign users to a task', async () => {
      const task = mockTaskFactory();
      const userIds = [1, 2];
      // Mocking users assigned, ensuring they match User entity structure if possible
      const updatedTask = mockTaskFactory({ ...task, users: [{ id: 1 } as User, { id: 2 } as User] });

      (taskRepository.findOne as jest.Mock).mockResolvedValue(task);
      // Mocking the update to return the task with assigned users.
      // Assuming the update method can handle assigning user IDs.
      (taskRepository.update as jest.Mock).mockResolvedValue({ ...task, users: [{ id: 1 }, { id: 2 }] });
      (taskRepository.findOne as jest.Mock).mockResolvedValue(updatedTask);

      const result = await service.assignUsers(task.id, userIds);
      expect(result).toEqual(updatedTask);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: task.id },
        relations: ['project', 'reviewer', 'users', 'occupations']
      });
      // Adjusting the expected call to `update` if it expects user IDs directly or a different structure
      expect(taskRepository.update).toHaveBeenCalledWith(task.id, { users: userIds });
    });

    it('should throw NotFoundException if task is not found for user assignment', async () => {
      const taskId = 999;
      const userIds = [1, 2];
      (taskRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.assignUsers(taskId, userIds)).rejects.toThrow(NotFoundException);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
        relations: ['project', 'reviewer', 'users', 'occupations'], // Restored original relations
      });
      expect(taskRepository.update).not.toHaveBeenCalled();
    });
  });
});