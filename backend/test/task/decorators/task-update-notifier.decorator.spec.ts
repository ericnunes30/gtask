import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskUpdateNotifierDecorator } from '../../../src/modules/tasks/decorators/task-update-notifier.decorator';
import { TaskService } from '../../../src/modules/tasks/services/task.service';
import { UpdateTaskDto } from '../../../src/modules/tasks/dto/update-task.dto';
import { Task } from '../../../src/modules/tasks/entities/task.entity';
import { mockTaskFactory } from '../../mocks/factory';
import { Status } from '../../../src/modules/tasks/entities/enums';

describe('TaskUpdateNotifierDecorator', () => {
  let decorator: TaskUpdateNotifierDecorator;
  let mockTaskService: Partial<TaskService>;
  let mockEventEmitter: Partial<EventEmitter2>;

  const mockUserId = 1;
  const mockTaskId = 1;

  beforeEach(async () => {
    mockTaskService = {
      update: jest.fn(),
      findOne: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskUpdateNotifierDecorator,
        {
          provide: TaskService,
          useValue: mockTaskService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    decorator = module.get<TaskUpdateNotifierDecorator>(TaskUpdateNotifierDecorator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should call underlying service and emit events for successful update', async () => {
      const oldTask = mockTaskFactory({ id: mockTaskId, status: Status.Backlog as any });
      const updateDto: UpdateTaskDto = { title: 'Updated Task', status: Status.InProgress as any };
      const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task', status: Status.InProgress as any });
      const fullTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task', status: Status.InProgress as any });

      (mockTaskService.findOne as jest.Mock)
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(fullTask);
      (mockTaskService.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await decorator.update(mockTaskId, updateDto, mockUserId);

      expect(result).toEqual(updatedTask);
      expect(mockTaskService.update).toHaveBeenCalledWith(mockTaskId, updateDto, mockUserId);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.updated', {
        task: fullTask,
        updatedBy: mockUserId,
        changedFields: {
          title: { oldValue: oldTask.title, newValue: updateDto.title },
          status: { oldValue: oldTask.status, newValue: updateDto.status },
        },
      });
    });

    it('should emit task.status.changed event when status changes', async () => {
      const oldTask = mockTaskFactory({ id: mockTaskId, status: Status.Backlog as any });
      const updateDto: UpdateTaskDto = { status: Status.InProgress as any };
      const updatedTask = mockTaskFactory({ id: mockTaskId, status: Status.InProgress as any });
      const fullTask = mockTaskFactory({ id: mockTaskId, status: Status.InProgress as any });

      (mockTaskService.findOne as jest.Mock)
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(fullTask);
      (mockTaskService.update as jest.Mock).mockResolvedValue(updatedTask);

      await decorator.update(mockTaskId, updateDto, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.status.changed', {
        task: fullTask,
        updatedBy: mockUserId,
        oldStatus: Status.Backlog,
        newStatus: Status.InProgress,
      });
    });

    it('should emit task.assignees.updated event when users are updated', async () => {
      const oldTask = mockTaskFactory({ id: mockTaskId, users: [] });
      const updateDto: UpdateTaskDto = { users: [1, 2] };
      const updatedTask = mockTaskFactory({ id: mockTaskId });
      const fullTask = mockTaskFactory({ id: mockTaskId });

      (mockTaskService.findOne as jest.Mock)
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(fullTask);
      (mockTaskService.update as jest.Mock).mockResolvedValue(updatedTask);

      await decorator.update(mockTaskId, updateDto, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.assignees.updated', {
        task: updatedTask,
        updatedBy: mockUserId,
        action: 'set',
        userIds: [1, 2],
      });
    });

    it('should not emit task.status.changed event when status does not change', async () => {
      const oldTask = mockTaskFactory({ id: mockTaskId, status: Status.Backlog as any });
      const updateDto: UpdateTaskDto = { title: 'Updated Task' };
      const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task', status: Status.Backlog as any });
      const fullTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task', status: Status.Backlog as any });

      (mockTaskService.findOne as jest.Mock)
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(fullTask);
      (mockTaskService.update as jest.Mock).mockResolvedValue(updatedTask);

      await decorator.update(mockTaskId, updateDto, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.updated', expect.any(Object));
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('task.status.changed', expect.any(Object));
    });

    it('should not emit task.assignees.updated event when users are not updated', async () => {
      const oldTask = mockTaskFactory({ id: mockTaskId });
      const updateDto: UpdateTaskDto = { title: 'Updated Task' };
      const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task' });
      const fullTask = mockTaskFactory({ id: mockTaskId, title: 'Updated Task' });

      (mockTaskService.findOne as jest.Mock)
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(fullTask);
      (mockTaskService.update as jest.Mock).mockResolvedValue(updatedTask);

      await decorator.update(mockTaskId, updateDto, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.updated', expect.any(Object));
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('task.assignees.updated', expect.any(Object));
    });

    it('should correctly identify changed fields', async () => {
      const oldTask = mockTaskFactory({ 
        id: mockTaskId, 
        title: 'Old Title',
        priority: 'baixa' as any,
        timer: 100,
      });
      const updateDto: UpdateTaskDto = { 
        title: 'New Title',
        priority: 'alta' as any,
        timer: 200,
        users: [1, 2], // This should be skipped
        occupations: [1], // This should be skipped
      };
      const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'New Title', priority: 'alta' as any, timer: 200 });
      const fullTask = mockTaskFactory({ id: mockTaskId, title: 'New Title', priority: 'alta' as any, timer: 200 });

      (mockTaskService.findOne as jest.Mock)
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(fullTask);
      (mockTaskService.update as jest.Mock).mockResolvedValue(updatedTask);

      await decorator.update(mockTaskId, updateDto, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.updated', {
        task: fullTask,
        updatedBy: mockUserId,
        changedFields: {
          title: { oldValue: 'Old Title', newValue: 'New Title' },
          priority: { oldValue: 'baixa', newValue: 'alta' },
          timer: { oldValue: 100, newValue: 200 },
        },
      });
    });

    it('should handle unchanged fields correctly', async () => {
      const oldTask = mockTaskFactory({ id: mockTaskId, title: 'Same Title', timer: 100 });
      const updateDto: UpdateTaskDto = { title: 'Same Title', timer: 100 }; // No actual changes
      const updatedTask = mockTaskFactory({ id: mockTaskId, title: 'Same Title', timer: 100 });
      const fullTask = mockTaskFactory({ id: mockTaskId, title: 'Same Title', timer: 100 });

      (mockTaskService.findOne as jest.Mock)
        .mockResolvedValueOnce(oldTask)
        .mockResolvedValueOnce(fullTask);
      (mockTaskService.update as jest.Mock).mockResolvedValue(updatedTask);

      await decorator.update(mockTaskId, updateDto, mockUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.updated', {
        task: fullTask,
        updatedBy: mockUserId,
        changedFields: {}, // No fields changed
      });
    });

    it('should propagate errors from underlying service', async () => {
      const updateDto: UpdateTaskDto = { title: 'Updated Task' };
      const error = new Error('Update failed');

      (mockTaskService.update as jest.Mock).mockRejectedValue(error);

      await expect(decorator.update(mockTaskId, updateDto, mockUserId))
        .rejects.toThrow('Update failed');
      
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});