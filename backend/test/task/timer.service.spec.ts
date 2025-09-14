import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TimerService } from '../../src/modules/tasks/services/timer.service';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { mockTaskFactory, mockUserFactory } from '../mocks/factory';

describe('TimerService', () => {
  let service: TimerService;
  let taskRepository: Partial<Repository<Task>>;
  let eventEmitter: Partial<EventEmitter2>;

  const mockTaskId = 1;
  const mockUserId = 1;
  const mockTask = mockTaskFactory({ id: mockTaskId, timer: 100, users: [mockUserFactory({ id: mockUserId })] });
  const mockOtherTaskId = 2;
  const mockOtherTask = mockTaskFactory({ id: mockOtherTaskId, timer: 50, users: [mockUserFactory({ id: mockUserId })] });

  beforeEach(async () => {
    taskRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimerService,
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepository,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<TimerService>(TimerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear active timers to avoid interference between tests
    (service as any).activeTimers.clear();
  });

  describe('start', () => {
    it('should start timer for a task', async () => {
      (taskRepository.findOne as jest.Mock).mockResolvedValue(mockTask);

      await service.start(mockTaskId, mockUserId);

      expect(taskRepository.findOne).toHaveBeenCalledWith({ 
        where: { id: mockTaskId }, 
        relations: ['users'] 
      });
      expect((service as any).activeTimers.has(mockTaskId)).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('timer.started', {
        taskId: mockTaskId,
        userId: mockUserId,
      });
    });

    it('should not start timer if task not found', async () => {
      (taskRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.start(mockTaskId, mockUserId);

      expect((service as any).activeTimers.has(mockTaskId)).toBe(false);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not start timer if already running for the same task', async () => {
      (taskRepository.findOne as jest.Mock).mockResolvedValue(mockTask);

      // Start timer first time
      await service.start(mockTaskId, mockUserId);
      
      // Try to start same timer again
      await service.start(mockTaskId, mockUserId);

      // Should only have one timer
      expect((service as any).activeTimers.get(mockTaskId)).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1); // Only emitted once
    });

    it('should pause other active timers for the same user', async () => {
      // Mock the other task
      (taskRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockOtherTask)
        .mockResolvedValueOnce(mockTask);

      // Start timer for other task
      await service.start(mockOtherTaskId, mockUserId);
      
      // Clear mock to track new calls
      jest.clearAllMocks();
      (taskRepository.findOne as jest.Mock).mockResolvedValue(mockTask);

      // Start timer for main task
      await service.start(mockTaskId, mockUserId);

      // Other task's timer should be paused
      expect(taskRepository.update).toHaveBeenCalledWith(mockOtherTaskId, { timer: expect.any(Number) });
      expect((service as any).activeTimers.has(mockOtherTaskId)).toBe(false);
      expect((service as any).activeTimers.has(mockTaskId)).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('timer.paused', expect.objectContaining({
        taskId: mockOtherTaskId,
        userId: mockUserId,
      }));
    });

    it('should start with existing timer value', async () => {
      const taskWithTimer = mockTaskFactory({ id: mockTaskId, timer: 300, users: [mockUserFactory({ id: mockUserId })] });
      (taskRepository.findOne as jest.Mock).mockResolvedValue(taskWithTimer);

      await service.start(mockTaskId, mockUserId);

      const timerData = (service as any).activeTimers.get(mockTaskId);
      expect(timerData.seconds).toBe(300);
    });

    it('should start with default timer value if none exists', async () => {
      const taskWithoutTimer = mockTaskFactory({ id: mockTaskId, timer: null, users: [mockUserFactory({ id: mockUserId })] });
      (taskRepository.findOne as jest.Mock).mockResolvedValue(taskWithoutTimer);

      await service.start(mockTaskId, mockUserId);

      const timerData = (service as any).activeTimers.get(mockTaskId);
      expect(timerData.seconds).toBe(0);
    });

    it('should emit timer.tick events periodically', (done) => {
      (taskRepository.findOne as jest.Mock).mockResolvedValue(mockTask);

      service.start(mockTaskId, mockUserId).then(() => {
        // Wait for a few ticks
        setTimeout(() => {
          expect(eventEmitter.emit).toHaveBeenCalledWith('timer.tick', {
            taskId: mockTaskId,
            seconds: expect.any(Number),
          });
          done();
        }, 1500); // Wait for at least one tick (1 second interval)
      });
    });

    it('should increment timer correctly', (done) => {
      (taskRepository.findOne as jest.Mock).mockResolvedValue(mockTask);

      service.start(mockTaskId, mockUserId).then(() => {
        const initialSeconds = (service as any).activeTimers.get(mockTaskId).seconds;
        
        setTimeout(() => {
          const currentSeconds = (service as any).activeTimers.get(mockTaskId).seconds;
          expect(currentSeconds).toBe(initialSeconds + 1);
          done();
        }, 1100); // Wait for one tick
      });
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
      await service.pause(mockTaskId, mockUserId);

      expect((service as any).activeTimers.has(mockTaskId)).toBe(false);
      expect(taskRepository.update).toHaveBeenCalledWith(mockTaskId, { timer: 150 });
      expect(eventEmitter.emit).toHaveBeenCalledWith('timer.paused', {
        taskId: mockTaskId,
        seconds: 150,
        userId: mockUserId,
      });
    });

    it('should do nothing if timer is not running', async () => {
      (service as any).activeTimers.delete(mockTaskId); // Remove the timer

      await service.pause(mockTaskId, mockUserId);

      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should clear interval correctly', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      await service.pause(mockTaskId, mockUserId);

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('timer state management', () => {
    it('should track multiple timers independently', async () => {
      const user1 = 1;
      const user2 = 2;
      const task1 = mockTaskFactory({ id: 1, users: [mockUserFactory({ id: user1 })] });
      const task2 = mockTaskFactory({ id: 2, users: [mockUserFactory({ id: user2 })] });

      (taskRepository.findOne as jest.Mock)
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
      (taskRepository.findOne as jest.Mock).mockResolvedValueOnce(task1);
      await service.start(1, user1);

      // Start timer for second user (first timer should remain active)
      (taskRepository.findOne as jest.Mock).mockResolvedValueOnce(task2);
      await service.start(2, user2);

      // Both timers should be running
      expect((service as any).activeTimers.has(1)).toBe(true);
      expect((service as any).activeTimers.has(2)).toBe(true);
    });
  });
});