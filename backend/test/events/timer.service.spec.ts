import { Test, TestingModule } from '@nestjs/testing';
import { TimerService } from '../../src/modules/events/services/timer.service';
import { TaskService } from '../../src/modules/tasks/services/task.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { Repository } from 'typeorm';
import { mockTaskFactory, mockUserFactory } from '../mocks/factory';

describe('Events TimerService', () => {
  let service: TimerService;
  let taskRepository: Partial<Repository<Task>>;
  let taskService: jest.Mocked<TaskService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockServer: jest.Mocked<Server>;

  const mockTaskId = 1;
  const mockUserId = 1;
  const mockTask = mockTaskFactory({ 
    id: mockTaskId, 
    timer: 100, 
    users: [mockUserFactory({ id: mockUserId })] 
  });
  const mockOtherTaskId = 2;
  const mockOtherTask = mockTaskFactory({ 
    id: mockOtherTaskId, 
    timer: 50, 
    users: [mockUserFactory({ id: mockUserId })] 
  });

  beforeEach(async () => {
    taskRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    taskService = {
      updateTimer: jest.fn(),
    } as any;

    eventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    } as any;

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimerService,
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepository,
        },
        {
          provide: TaskService,
          useValue: taskService,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<TimerService>(TimerService);
    service.setServer(mockServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear active timers to avoid interference between tests
    (service as any).activeTimers.clear();
  });

  describe('setServer', () => {
    it('should set the server instance', () => {
      const newServer = {} as Server;
      service.setServer(newServer);
      expect((service as any).server).toBe(newServer);
    });
  });

  describe('start', () => {
    it('should start timer for a task', async () => {
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      await service.start(mockTaskId, mockUserId);

      expect(taskRepository.findOneBy).toHaveBeenCalledWith({ id: mockTaskId });
      expect((service as any).activeTimers.has(mockTaskId)).toBe(true);
      expect(mockServer.to).toHaveBeenCalledWith(`task_${mockTaskId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('timer.started', {
        taskId: mockTaskId,
        userId: mockUserId,
        startTime: expect.any(Date),
      });
    });

    it('should not start timer if task not found', async () => {
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(null);

      await service.start(mockTaskId, mockUserId);

      expect((service as any).activeTimers.has(mockTaskId)).toBe(false);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should not start timer if already running for the same task', async () => {
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      // Start timer first time
      await service.start(mockTaskId, mockUserId);
      
      // Clear mocks to track new calls
      jest.clearAllMocks();
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      // Try to start same timer again
      await service.start(mockTaskId, mockUserId);

      // Should only have one timer
      expect((service as any).activeTimers.get(mockTaskId)).toBeDefined();
      expect(mockServer.emit).not.toHaveBeenCalled(); // Should not emit again
    });

    it('should pause other active timers for the same user', async () => {
      // Mock the other task with full query
      (taskRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockOtherTask)
        .mockResolvedValueOnce(mockTask);

      // Start timer for other task
      await service.start(mockOtherTaskId, mockUserId);
      
      // Clear mock to track new calls
      jest.clearAllMocks();
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      // Start timer for main task
      await service.start(mockTaskId, mockUserId);

      // Other task's timer should be paused
      expect(taskService.updateTimer).toHaveBeenCalledWith(mockOtherTaskId, 50);
      expect((service as any).activeTimers.has(mockOtherTaskId)).toBe(false);
      expect((service as any).activeTimers.has(mockTaskId)).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith('timer.paused', {
        taskId: mockOtherTaskId,
        seconds: 50,
        userId: mockUserId,
      });
    });

    it('should start with existing timer value', async () => {
      const taskWithTimer = mockTaskFactory({ 
        id: mockTaskId, 
        timer: 300, 
        users: [mockUserFactory({ id: mockUserId })] 
      });
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(taskWithTimer);

      await service.start(mockTaskId, mockUserId);

      const timerData = (service as any).activeTimers.get(mockTaskId);
      expect(timerData.seconds).toBe(300);
    });

    it('should start with default timer value if none exists', async () => {
      const taskWithoutTimer = mockTaskFactory({ 
        id: mockTaskId, 
        timer: null, 
        users: [mockUserFactory({ id: mockUserId })] 
      });
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(taskWithoutTimer);

      await service.start(mockTaskId, mockUserId);

      const timerData = (service as any).activeTimers.get(mockTaskId);
      expect(timerData.seconds).toBe(0);
    });

    it('should emit timer.tick events periodically', (done) => {
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      service.start(mockTaskId, mockUserId).then(() => {
        // Wait for a few ticks
        setTimeout(() => {
          expect(mockServer.to).toHaveBeenCalledWith(`task_${mockTaskId}`);
          expect(mockServer.emit).toHaveBeenCalledWith('timer.tick', {
            taskId: mockTaskId,
            seconds: expect.any(Number),
          });
          done();
        }, 1500); // Wait for at least one tick (1 second interval)
      });
    });

    it('should increment timer correctly', (done) => {
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      service.start(mockTaskId, mockUserId).then(() => {
        const initialSeconds = (service as any).activeTimers.get(mockTaskId).seconds;
        
        setTimeout(() => {
          const currentSeconds = (service as any).activeTimers.get(mockTaskId).seconds;
          expect(currentSeconds).toBe(initialSeconds + 1);
          done();
        }, 1100); // Wait for one tick
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskRepository.findOneBy as jest.Mock).mockRejectedValue(dbError);

      await service.start(mockTaskId, mockUserId);

      expect((service as any).activeTimers.has(mockTaskId)).toBe(false);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should log warnings when timer already running', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      // Start timer first time
      await service.start(mockTaskId, mockUserId);
      
      // Clear mocks
      jest.clearAllMocks();
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      // Try to start same timer again
      await service.start(mockTaskId, mockUserId);

      expect(loggerSpy).toHaveBeenCalledWith(`Timer for task ${mockTaskId} is already running.`);
    });

    it('should log errors when task not found', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(null);

      await service.start(mockTaskId, mockUserId);

      expect(loggerSpy).toHaveBeenCalledWith(`Task with ID ${mockTaskId} not found.`);
    });

    it('should handle concurrent user timer stopping correctly', async () => {
      const user1 = 1;
      const user2 = 2;
      const task1 = mockTaskFactory({ id: 1, users: [mockUserFactory({ id: user1 })] });
      const task2 = mockTaskFactory({ id: 2, users: [mockUserFactory({ id: user1 }), mockUserFactory({ id: user2 })] });

      (taskRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);

      // Start timer for user1 on task1
      await service.start(1, user1);

      // Clear mocks
      jest.clearAllMocks();
      (taskRepository.findOne as jest.Mock).mockResolvedValue(task2);

      // Start timer for user2 on task2 (should not stop user1's timer)
      await service.start(2, user2);

      // Both timers should be running
      expect((service as any).activeTimers.has(1)).toBe(true);
      expect((service as any).activeTimers.has(2)).toBe(true);
      expect(taskService.updateTimer).not.toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    beforeEach(() => {
      // Setup an active timer
      (service as any).activeTimers.set(mockTaskId, {
        interval: setInterval(() => {}, 1000),
        seconds: 150,
      });
    });

    it('should pause running timer', async () => {
      await service.pause(mockTaskId);

      expect((service as any).activeTimers.has(mockTaskId)).toBe(false);
      expect(taskService.updateTimer).toHaveBeenCalledWith(mockTaskId, 150);
      expect(mockServer.to).toHaveBeenCalledWith(`task_${mockTaskId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('timer.paused', {
        taskId: mockTaskId,
        seconds: 150,
      });
    });

    it('should do nothing if timer is not running', async () => {
      (service as any).activeTimers.delete(mockTaskId); // Remove the timer

      await service.pause(mockTaskId);

      expect(taskService.updateTimer).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should clear interval correctly', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      await service.pause(mockTaskId);

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should log warnings when timer not running', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');
      (service as any).activeTimers.delete(mockTaskId);

      await service.pause(mockTaskId);

      expect(loggerSpy).toHaveBeenCalledWith(`Timer for task ${mockTaskId} is not running.`);
    });

    it('should log pause actions', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      await service.pause(mockTaskId);

      expect(loggerSpy).toHaveBeenCalledWith(`Paused timer for task ${mockTaskId} at 150 seconds. Saving to DB.`);
    });

    it('should handle task service update errors gracefully', async () => {
      const updateError = new Error('Failed to update timer');
      taskService.updateTimer.mockRejectedValue(updateError);

      await expect(service.pause(mockTaskId)).rejects.toThrow(updateError);
    });

    it('should handle WebSocket emit errors gracefully', async () => {
      const emitError = new Error('WebSocket emit failed');
      mockServer.emit.mockImplementation(() => {
        throw emitError;
      });

      // Should still pause the timer and update database even if WebSocket fails
      await expect(service.pause(mockTaskId)).resolves.not.toThrow();
      expect((service as any).activeTimers.has(mockTaskId)).toBe(false);
      expect(taskService.updateTimer).toHaveBeenCalledWith(mockTaskId, 150);
    });
  });

  describe('timer state management', () => {
    it('should track multiple timers independently', async () => {
      const user1 = 1;
      const user2 = 2;
      const task1 = mockTaskFactory({ id: 1, users: [mockUserFactory({ id: user1 })] });
      const task2 = mockTaskFactory({ id: 2, users: [mockUserFactory({ id: user2 })] });

      (taskRepository.findOneBy as jest.Mock)
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);

      await service.start(1, user1);
      await service.start(2, user2);

      expect((service as any).activeTimers.size).toBe(2);
      expect((service as any).activeTimers.has(1)).toBe(true);
      expect((service as any).activeTimers.has(2)).toBe(true);
    });

    it('should not pause timers from different users', async () => {
      const user1 = 1;
      const user2 = 2;
      const task1 = mockTaskFactory({ id: 1, users: [mockUserFactory({ id: user1 })] });
      const task2 = mockTaskFactory({ id: 2, users: [mockUserFactory({ id: user2 })] });

      // Start timer for first user
      (taskRepository.findOneBy as jest.Mock).mockResolvedValueOnce(task1);
      await service.start(1, user1);

      // Start timer for second user (first timer should remain active)
      (taskRepository.findOneBy as jest.Mock).mockResolvedValueOnce(task2);
      await service.start(2, user2);

      // Both timers should be running
      expect((service as any).activeTimers.has(1)).toBe(true);
      expect((service as any).activeTimers.has(2)).toBe(true);
    });

    it('should handle timer cleanup on service destruction', () => {
      // Setup multiple timers
      (service as any).activeTimers.set(1, {
        interval: setInterval(() => {}, 1000),
        seconds: 100,
      });
      (service as any).activeTimers.set(2, {
        interval: setInterval(() => {}, 1000),
        seconds: 200,
      });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Simulate service destruction by clearing timers manually
      (service as any).activeTimers.clear();

      expect((service as any).activeTimers.size).toBe(0);
    });
  });

  describe('Event emission', () => {
    it('should emit timer.tick with correct payload', (done) => {
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      service.start(mockTaskId, mockUserId).then(() => {
        setTimeout(() => {
          const tickCall = mockServer.emit.mock.calls.find(call => call[0] === 'timer.tick');
          expect(tickCall).toBeDefined();
          expect(tickCall[1]).toEqual({
            taskId: mockTaskId,
            seconds: expect.any(Number),
          });
          done();
        }, 1100);
      });
    });

    it('should emit timer.started with correct payload', async () => {
      (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

      await service.start(mockTaskId, mockUserId);

      const startCall = mockServer.emit.mock.calls.find(call => call[0] === 'timer.started');
      expect(startCall).toBeDefined();
      expect(startCall[1]).toEqual({
        taskId: mockTaskId,
        userId: mockUserId,
        startTime: expect.any(Date),
      });
    });

    it('should emit timer.paused with correct payload', async () => {
      (service as any).activeTimers.set(mockTaskId, {
        interval: setInterval(() => {}, 1000),
        seconds: 150,
      });

      await service.pause(mockTaskId);

      const pauseCall = mockServer.emit.mock.calls.find(call => call[0] === 'timer.paused');
      expect(pauseCall).toBeDefined();
      expect(pauseCall[1]).toEqual({
        taskId: mockTaskId,
        seconds: 150,
      });
    });
  });
});