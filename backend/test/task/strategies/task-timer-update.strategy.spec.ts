import { RepositoryTimerUpdateStrategy, EntityTimerUpdateStrategy } from '../../src/modules/tasks/strategies/task-timer-update.strategy';
import { Repository } from 'typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockTaskFactory } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';

describe('TaskTimerUpdateStrategies', () => {
  const mockTaskId = 1;
  const mockTimerValue = 1200;

  describe('RepositoryTimerUpdateStrategy', () => {
    let strategy: RepositoryTimerUpdateStrategy;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      strategy = new RepositoryTimerUpdateStrategy();
      mockRepository = {
        findOne: jest.fn(),
        update: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('canHandle', () => {
      it('should return true when repository has update method', () => {
        mockRepository.update = jest.fn();
        expect(strategy.canHandle(mockRepository)).toBe(true);
      });

      it('should return false when repository does not have update method', () => {
        expect(strategy.canHandle(mockRepository)).toBe(false);
      });
    });

    describe('execute', () => {
      it('should update timer successfully', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, users: [] });
        const updatedTask = mockTaskFactory({ id: mockTaskId, timer: mockTimerValue });

        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockResolvedValueOnce(updatedTask);

        const result = await strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          relations: ['users'],
        });
        expect(mockRepository.update).toHaveBeenCalledWith(mockTaskId, { timer: mockTimerValue });
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          relations: ['project', 'reviewer', 'users', 'occupations'],
        });
      });

      it('should throw NotFoundException when task not found', async () => {
        (mockRepository.findOne as jest.Mock).mockResolvedValue(null);

        await expect(strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>))
          .rejects.toThrow(NotFoundException);
        await expect(strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>))
          .rejects.toThrow(`Task with ID ${mockTaskId} not found`);
      });

      it('should handle database errors gracefully', async () => {
        const error = new Error('Database connection failed');
        (mockRepository.findOne as jest.Mock).mockRejectedValue(error);

        await expect(strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>))
          .rejects.toThrow(error);
      });

      it('should handle update operation failure', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, users: [] });
        const updateError = new Error('Update failed');
        
        (mockRepository.findOne as jest.Mock).mockResolvedValueOnce(existingTask);
        (mockRepository.update as jest.Mock).mockRejectedValue(updateError);

        await expect(strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>))
          .rejects.toThrow(updateError);
      });

      it('should validate timer value is number', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, users: [] });
        const updatedTask = mockTaskFactory({ id: mockTaskId, timer: mockTimerValue });

        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockResolvedValueOnce(updatedTask);

        const result = await strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>);

        expect(mockRepository.update).toHaveBeenCalledWith(mockTaskId, { timer: mockTimerValue });
        expect(typeof mockTimerValue).toBe('number');
      });

      it('should handle zero timer value', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, users: [] });
        const updatedTask = mockTaskFactory({ id: mockTaskId, timer: 0 });
        const zeroTimer = 0;

        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockResolvedValueOnce(updatedTask);

        const result = await strategy.execute(mockTaskId, zeroTimer, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(mockRepository.update).toHaveBeenCalledWith(mockTaskId, { timer: 0 });
      });

      it('should handle negative timer value', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, users: [] });
        const updatedTask = mockTaskFactory({ id: mockTaskId, timer: -100 });
        const negativeTimer = -100;

        (mockRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(existingTask)
          .mockResolvedValueOnce(updatedTask);

        const result = await strategy.execute(mockTaskId, negativeTimer, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(mockRepository.update).toHaveBeenCalledWith(mockTaskId, { timer: negativeTimer });
      });
    });
  });

  describe('EntityTimerUpdateStrategy', () => {
    let strategy: EntityTimerUpdateStrategy;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      strategy = new EntityTimerUpdateStrategy();
      mockRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('canHandle', () => {
      it('should always return true (fallback strategy)', () => {
        expect(strategy.canHandle()).toBe(true);
      });
    });

    describe('execute', () => {
      it('should update timer on entity successfully', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, timer: 0 });
        const updatedTask = mockTaskFactory({ id: mockTaskId, timer: mockTimerValue });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(existingTask.timer).toBe(mockTimerValue);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          relations: ['project', 'reviewer', 'users', 'occupations'],
        });
        expect(mockRepository.save).toHaveBeenCalledWith(existingTask);
      });

      it('should throw NotFoundException when task not found', async () => {
        (mockRepository.findOne as jest.Mock).mockResolvedValue(null);

        await expect(strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>))
          .rejects.toThrow(NotFoundException);
        await expect(strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>))
          .rejects.toThrow(`Task with ID ${mockTaskId} not found`);
      });

      it('should handle save operation failure', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, timer: 0 });
        const saveError = new Error('Save failed');
        
        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockRejectedValue(saveError);

        await expect(strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>))
          .rejects.toThrow(saveError);
      });

      it('should modify the original entity directly', async () => {
        const existingTask = mockTaskFactory({ id: mockTaskId, timer: 0 });
        const updatedTask = mockTaskFactory({ id: mockTaskId, timer: mockTimerValue });

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        await strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>);

        expect(existingTask.timer).toBe(mockTimerValue);
        expect(mockRepository.save).toHaveBeenCalledWith(existingTask);
      });

      it('should handle entity with complex relations', async () => {
        const existingTask = mockTaskFactory({ 
          id: mockTaskId, 
          timer: 0,
          project: { id: 1, title: 'Test Project' },
          reviewer: { id: 1, name: 'Test Reviewer' },
          users: [{ id: 1, name: 'Test User' }],
          occupations: [{ id: 1, name: 'Test Occupation' }]
        });
        
        const updatedTask = { ...existingTask, timer: mockTimerValue };

        (mockRepository.findOne as jest.Mock).mockResolvedValue(existingTask);
        (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

        const result = await strategy.execute(mockTaskId, mockTimerValue, mockRepository as Repository<Task>);

        expect(result).toEqual(updatedTask);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          relations: ['project', 'reviewer', 'users', 'occupations'],
        });
      });
    });
  });
});