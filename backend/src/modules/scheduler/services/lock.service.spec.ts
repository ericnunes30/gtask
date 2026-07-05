import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LockService } from './lock.service';
import { TaskLock } from '../entities/task-lock.entity';

type MockRepository<T> = jest.Mocked<Repository<T>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  } as unknown as MockRepository<T>;
}

describe('LockService', () => {
  let service: LockService;
  let repository: MockRepository<TaskLock>;

  beforeEach(async () => {
    repository = createMockRepository<TaskLock>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LockService,
        { provide: getRepositoryToken(TaskLock), useValue: repository },
      ],
    }).compile();

    service = module.get<LockService>(LockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acquire', () => {
    it('should return true when lock is acquired successfully', async () => {
      const lockKey = 'test-lock';
      const lock = {
        lockKey,
        instanceId: 'test-instance',
        createdAt: new Date(),
      } as TaskLock;

      repository.create.mockReturnValue(lock);
      repository.save.mockResolvedValue(lock);

      const result = await service.acquire(lockKey);

      expect(result).toBe(true);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ lockKey }),
      );
      expect(repository.save).toHaveBeenCalledWith(lock);
    });

    it('should return false when lock already exists (unique violation)', async () => {
      const lockKey = 'test-lock';
      const error = new Error('Unique violation');
      (error as Error & { code: string }).code = '23505';

      repository.create.mockReturnValue({
        lockKey,
        instanceId: 'test-instance',
        createdAt: new Date(),
      } as TaskLock);
      repository.save.mockRejectedValue(error);

      const result = await service.acquire(lockKey);

      expect(result).toBe(false);
    });

    it('should throw on unexpected errors', async () => {
      const lockKey = 'test-lock';
      const error = new Error('Database connection failed');

      repository.create.mockReturnValue({
        lockKey,
        instanceId: 'test-instance',
        createdAt: new Date(),
      } as TaskLock);
      repository.save.mockRejectedValue(error);

      await expect(service.acquire(lockKey)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('release', () => {
    it('should delete the lock without throwing', async () => {
      const lockKey = 'test-lock';
      repository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.release(lockKey);

      expect(repository.delete).toHaveBeenCalledWith({ lockKey });
    });

    it('should not throw when delete fails', async () => {
      const lockKey = 'test-lock';
      const error = new Error('Delete failed');
      repository.delete.mockRejectedValue(error);

      await expect(service.release(lockKey)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith({ lockKey });
    });

    it('should log non-Error rejection via String() without throwing', async () => {
      const lockKey = 'test-lock';
      repository.delete.mockRejectedValue('connection lost' as never);

      await expect(service.release(lockKey)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith({ lockKey });
    });
  });

  describe('acquire with non-Error rejection', () => {
    it('should rethrow non-Error, non-object rejection (getErrorCode non-object branch)', async () => {
      const lockKey = 'test-lock';
      repository.create.mockReturnValue({
        lockKey,
        instanceId: 'test-instance',
        createdAt: new Date(),
      } as TaskLock);
      repository.save.mockRejectedValue('unexpected string' as never);

      await expect(service.acquire(lockKey)).rejects.toBe('unexpected string');
    });
  });
});
