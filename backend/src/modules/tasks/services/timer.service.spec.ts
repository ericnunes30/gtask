import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { TimerService } from './timer.service';
import { Task } from '../entities/task.entity';
import { TaskNotFoundException } from '../exceptions/task-not-found.exception';

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as MockRepository<T>;
}

describe('TimerService', () => {
  let service: TimerService;
  let taskRepository: MockRepository<Task>;
  let eventEmitter: { emit: jest.Mock };
  let intervalCallback: (() => void) | undefined;

  beforeEach(async () => {
    taskRepository = createMockRepository<Task>();
    eventEmitter = { emit: jest.fn() };

    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval').mockImplementation((callback) => {
      intervalCallback = callback as () => void;
      return 123 as unknown as NodeJS.Timeout;
    });
    jest.spyOn(global, 'clearInterval').mockImplementation(() => {
      intervalCallback = undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimerService,
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TimerService>(TimerService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('start', () => {
    it('should start timer and emit event', async () => {
      taskRepository.findOne.mockResolvedValue({
        id: 1,
        timer: 10,
        users: [{ id: 1 }],
      } as unknown as Task);

      await service.start(1, 1);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'timer.started',
        expect.objectContaining({ taskId: 1, userId: 1 }),
      );
      expect(setInterval).toHaveBeenCalled();
    });

    it('should throw TaskNotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.start(1, 1)).rejects.toThrow(TaskNotFoundException);
    });

    it('should not start duplicate timer for same task', async () => {
      taskRepository.findOne.mockResolvedValue({
        id: 1,
        timer: 0,
        users: [{ id: 1 }],
      } as unknown as Task);

      await service.start(1, 1);
      await service.start(1, 1);

      expect(setInterval).toHaveBeenCalledTimes(1);
    });

    it('should pause other timer from same user', async () => {
      taskRepository.findOne.mockImplementation((opts: unknown) => {
        const where = (opts as { where: { id: number } }).where;
        return {
          id: where.id,
          timer: 0,
          users: [{ id: 1 }],
        } as unknown as Task;
      });

      await service.start(1, 1);
      await service.start(2, 1);

      expect(taskRepository.update).toHaveBeenCalledWith(1, { timer: 0 });
    });
  });

  describe('pause', () => {
    it('should update task and emit timer.paused event', async () => {
      taskRepository.findOne.mockResolvedValue({
        id: 1,
        timer: 0,
        users: [{ id: 1 }],
      } as unknown as Task);
      taskRepository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.start(1, 1);
      intervalCallback?.();
      await service.pause(1, 1);

      expect(clearInterval).toHaveBeenCalled();
      expect(taskRepository.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'timer.paused',
        expect.objectContaining({ taskId: 1 }),
      );
    });

    it('should ignore pause when timer is not running', async () => {
      await service.pause(1, 1);

      expect(taskRepository.update).not.toHaveBeenCalled();
    });
  });
});
