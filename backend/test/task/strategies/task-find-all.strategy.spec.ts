import { RepositoryFindAllStrategy, StandardFindAllStrategy } from '../../src/modules/tasks/strategies/task-find-all.strategy';
import { Repository } from 'typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockTaskFactory } from '../mocks/factory';

describe('TaskFindAllStrategies', () => {
  describe('RepositoryFindAllStrategy', () => {
    let strategy: RepositoryFindAllStrategy;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      strategy = new RepositoryFindAllStrategy();
      mockRepository = {};
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('canHandle', () => {
      it('should return true when repository has findAll method', () => {
        mockRepository.findAll = jest.fn();
        expect(strategy.canHandle(mockRepository)).toBe(true);
      });

      it('should return false when repository does not have findAll method', () => {
        expect(strategy.canHandle(mockRepository)).toBe(false);
      });
    });

    describe('execute', () => {
      it('should call repository findAll method', async () => {
        const tasks = [mockTaskFactory()];
        mockRepository.findAll = jest.fn().mockResolvedValue(tasks);

        const result = await strategy.execute(mockRepository as Repository<Task>);

        expect(result).toEqual(tasks);
        expect(mockRepository.findAll).toHaveBeenCalled();
      });

      it('should handle empty results from findAll', async () => {
        mockRepository.findAll = jest.fn().mockResolvedValue([]);

        const result = await strategy.execute(mockRepository as Repository<Task>);

        expect(result).toEqual([]);
        expect(mockRepository.findAll).toHaveBeenCalled();
      });

      it('should propagate errors from findAll', async () => {
        const error = new Error('Repository error');
        mockRepository.findAll = jest.fn().mockRejectedValue(error);

        await expect(strategy.execute(mockRepository as Repository<Task>)).rejects.toThrow(error);
      });

      it('should handle repository with findAll that returns non-array', async () => {
        const invalidResult = { not: 'an-array' };
        mockRepository.findAll = jest.fn().mockResolvedValue(invalidResult as any);

        const result = await strategy.execute(mockRepository as Repository<Task>);

        // A estratégia não valida o retorno, apenas repassa o que vier do repositório
        expect(result).toEqual(invalidResult);
      });
    });
  });

  describe('StandardFindAllStrategy', () => {
    let strategy: StandardFindAllStrategy;
    let mockRepository: Partial<Repository<Task>>;

    beforeEach(() => {
      strategy = new StandardFindAllStrategy();
      mockRepository = {
        find: jest.fn(),
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
      it('should call repository find with relations', async () => {
        const tasks = [mockTaskFactory()];
        mockRepository.find = jest.fn().mockResolvedValue(tasks);

        const result = await strategy.execute(mockRepository as Repository<Task>);

        expect(result).toEqual(tasks);
        expect(mockRepository.find).toHaveBeenCalledWith({
          relations: ['project', 'reviewer', 'users', 'occupations'],
        });
      });

      it('should handle empty results from find', async () => {
        mockRepository.find = jest.fn().mockResolvedValue([]);

        const result = await strategy.execute(mockRepository as Repository<Task>);

        expect(result).toEqual([]);
        expect(mockRepository.find).toHaveBeenCalledWith({
          relations: ['project', 'reviewer', 'users', 'occupations'],
        });
      });

      it('should propagate errors from find', async () => {
        const error = new Error('Database query failed');
        mockRepository.find = jest.fn().mockRejectedValue(error);

        await expect(strategy.execute(mockRepository as Repository<Task>)).rejects.toThrow(error);
      });

      it('should call find with exact relations object', async () => {
        const tasks = [mockTaskFactory()];
        mockRepository.find = jest.fn().mockResolvedValue(tasks);

        await strategy.execute(mockRepository as Repository<Task>);

        expect(mockRepository.find).toHaveBeenCalledTimes(1);
        const callArgs = (mockRepository.find as jest.Mock).mock.calls[0][0];
        expect(callArgs).toEqual({
          relations: ['project', 'reviewer', 'users', 'occupations'],
        });
        expect(Object.keys(callArgs)).toHaveLength(1); // Apenas relations, sem outras opções
      });

      it('should return the exact result from repository', async () => {
        const tasks = [
          mockTaskFactory({ id: 1 }),
          mockTaskFactory({ id: 2 }),
        ];
        mockRepository.find = jest.fn().mockResolvedValue(tasks);

        const result = await strategy.execute(mockRepository as Repository<Task>);

        expect(result).toBe(tasks); // mesma instância, não clone
        expect(result).toHaveLength(2);
      });
    });
  });
});