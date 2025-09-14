import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../src/modules/tasks/controllers/task.controller';
import { TaskService } from '../../src/modules/tasks/services/task.service';
import { TaskCreator } from '../../src/modules/tasks/services/task-creator.abstract';
import { TaskUpdater } from '../../src/modules/tasks/services/task-updater.abstract';
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../../src/modules/tasks/dto/update-task.dto';
import { mockTaskFactory, mockCreateTaskDtoFactory } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';

describe('TaskController', () => {
  let controller: TaskController;
  let taskService: TaskService;
  let taskCreator: TaskCreator;
  let taskUpdater: TaskUpdater;

  const mockRequest = { user: { sub: 1 } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            updateTimer: jest.fn(),
            assignUsers: jest.fn(),
            findByProject: jest.fn(),
            findByStatus: jest.fn(),
          },
        },
        {
          provide: TaskCreator,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: TaskUpdater,
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    taskService = module.get<TaskService>(TaskService);
    taskCreator = module.get<TaskCreator>(TaskCreator);
    taskUpdater = module.get<TaskUpdater>(TaskUpdater);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createTaskDto: CreateTaskDto = mockCreateTaskDtoFactory();
      const createdTask = mockTaskFactory({ ...createTaskDto, id: 1 });

      jest.spyOn(taskCreator, 'create').mockResolvedValue(createdTask);

      const result = await controller.create(createTaskDto, mockRequest);

      expect(result).toEqual(createdTask);
      expect(taskCreator.create).toHaveBeenCalledWith(createTaskDto, mockRequest.user.sub);
    });
  });

  describe('findAll', () => {
    it('should return all tasks when no query parameters', async () => {
      const tasks = [mockTaskFactory(), mockTaskFactory({ id: 2 })];
      jest.spyOn(taskService, 'findAll').mockResolvedValue(tasks);

      const result = await controller.findAll();

      expect(result).toEqual(tasks);
      expect(taskService.findAll).toHaveBeenCalledWith();
    });

    it('should return tasks by project when projectId provided', async () => {
      const projectId = '1';
      const tasks = [mockTaskFactory({ project_id: 1 })];
      jest.spyOn(taskService, 'findByProject').mockResolvedValue(tasks);

      const result = await controller.findAll(projectId);

      expect(result).toEqual(tasks);
      expect(taskService.findByProject).toHaveBeenCalledWith(parseInt(projectId));
    });

    it('should return tasks by status when status provided', async () => {
      const status = 'em_andamento';
      const tasks = [mockTaskFactory({ status: 'em_andamento' as any })];
      jest.spyOn(taskService, 'findByStatus').mockResolvedValue(tasks);

      const result = await controller.findAll(undefined, status);

      expect(result).toEqual(tasks);
      expect(taskService.findByStatus).toHaveBeenCalledWith(status);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const taskId = 1;
      const task = mockTaskFactory({ id: taskId });
      jest.spyOn(taskService, 'findOne').mockResolvedValue(task);

      const result = await controller.findOne(taskId.toString());

      expect(result).toEqual(task);
      expect(taskService.findOne).toHaveBeenCalledWith(taskId);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const taskId = 1;
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task' };
      const updatedTask = mockTaskFactory({ id: taskId, title: 'Updated Task' });

      jest.spyOn(taskUpdater, 'update').mockResolvedValue(updatedTask);

      const result = await controller.update(taskId.toString(), updateTaskDto, mockRequest);

      expect(result).toEqual(updatedTask);
      expect(taskUpdater.update).toHaveBeenCalledWith(taskId, updateTaskDto, mockRequest.user.sub);
    });
  });

  describe('patch', () => {
    it('should update a task using PATCH', async () => {
      const taskId = 1;
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task' };
      const updatedTask = mockTaskFactory({ id: taskId, title: 'Updated Task' });

      jest.spyOn(taskUpdater, 'update').mockResolvedValue(updatedTask);

      const result = await controller.patch(taskId.toString(), updateTaskDto, mockRequest);

      expect(result).toEqual(updatedTask);
      expect(taskUpdater.update).toHaveBeenCalledWith(taskId, updateTaskDto, mockRequest.user.sub);
    });

    it('should throw error when update fails', async () => {
      const taskId = 1;
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task' };
      const error = new NotFoundException('Task not found');

      jest.spyOn(taskUpdater, 'update').mockRejectedValue(error);

      await expect(controller.patch(taskId.toString(), updateTaskDto, mockRequest))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      const taskId = 1;
      jest.spyOn(taskService, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove(taskId.toString());

      expect(result).toBeUndefined();
      expect(taskService.remove).toHaveBeenCalledWith(taskId);
    });
  });

  describe('updateTimer', () => {
    it('should update task timer', async () => {
      const taskId = 1;
      const timerValue = 1200;
      const updatedTask = mockTaskFactory({ id: taskId, timer: timerValue });

      jest.spyOn(taskService, 'updateTimer').mockResolvedValue(updatedTask);

      const result = await controller.updateTimer(taskId.toString(), timerValue);

      expect(result).toEqual(updatedTask);
      expect(taskService.updateTimer).toHaveBeenCalledWith(taskId, timerValue);
    });
  });

  describe('assignUsers', () => {
    it('should assign users to a task', async () => {
      const taskId = 1;
      const userIds = [1, 2];
      const updatedTask = mockTaskFactory({ id: taskId });

      jest.spyOn(taskService, 'assignUsers').mockResolvedValue(updatedTask);

      const result = await controller.assignUsers(taskId.toString(), userIds);

      expect(result).toEqual(updatedTask);
      expect(taskService.assignUsers).toHaveBeenCalledWith(taskId, userIds);
    });
  });
});