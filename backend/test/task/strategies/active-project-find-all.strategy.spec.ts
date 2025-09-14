import { Repository } from 'typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { ActiveProjectFindAllStrategy } from '../../src/modules/tasks/strategies/active-project-find-all.strategy';
import { mockTaskFactory, mockProjectFactory } from '../mocks/factory';

describe('ActiveProjectFindAllStrategy', () => {
  let strategy: ActiveProjectFindAllStrategy;
  let mockRepository: Partial<Repository<Task>>;

  beforeEach(() => {
    strategy = new ActiveProjectFindAllStrategy();
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getQueryAndParameters: jest.fn().mockReturnValue('SELECT * FROM tasks'),
        getMany: jest.fn(),
      }),
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
    it('should return tasks with active projects', async () => {
      const tasks = [
        mockTaskFactory({ id: 1, project: mockProjectFactory({ status: true }) }),
        mockTaskFactory({ id: 2, project: mockProjectFactory({ status: true }) }),
      ];
      
      (mockRepository.createQueryBuilder as jest.Mock)().getMany.mockResolvedValue(tasks);

      const result = await strategy.execute(mockRepository as Repository<Task>);

      expect(result).toEqual(tasks);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('task');
    });

    it('should return empty array when no tasks found', async () => {
      (mockRepository.createQueryBuilder as jest.Mock)().getMany.mockResolvedValue([]);

      const result = await strategy.execute(mockRepository as Repository<Task>);

      expect(result).toEqual([]);
    });

    it('should build correct query with active project filter', async () => {
      const tasks = [mockTaskFactory()];
      (mockRepository.createQueryBuilder as jest.Mock)().getMany.mockResolvedValue(tasks);

      await strategy.execute(mockRepository as Repository<Task>);

      const queryBuilder = mockRepository.createQueryBuilder('task');
      expect(queryBuilder.innerJoinAndSelect).toHaveBeenCalledWith('task.project', 'project');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.reviewer', 'reviewer');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.users', 'users');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.occupations', 'occupations');
      expect(queryBuilder.where).toHaveBeenCalledWith('project.status = :status', { status: true });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('project.status IS NOT NULL');
    });

    it('should log query execution', async () => {
      const tasks = [mockTaskFactory()];
      const mockLogger = {
        log: jest.fn(),
      };
      (strategy as any).logger = mockLogger;
      (mockRepository.createQueryBuilder as jest.Mock)().getMany.mockResolvedValue(tasks);

      await strategy.execute(mockRepository as Repository<Task>);

      expect(mockLogger.log).toHaveBeenCalledWith('Executing ActiveProjectFindAllStrategy');
      expect(mockLogger.log).toHaveBeenCalledWith('Query SQL: SELECT * FROM tasks');
      expect(mockLogger.log).toHaveBeenCalledWith(`Found ${tasks.length} tasks`);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      (mockRepository.createQueryBuilder as jest.Mock)().getMany.mockRejectedValue(error);

      await expect(strategy.execute(mockRepository as Repository<Task>)).rejects.toThrow(error);
    });

    it('should include all required relations in query', async () => {
      const tasks = [mockTaskFactory()];
      (mockRepository.createQueryBuilder as jest.Mock)().getMany.mockResolvedValue(tasks);

      await strategy.execute(mockRepository as Repository<Task>);

      const queryBuilder = mockRepository.createQueryBuilder('task');
      
      // Verificar que todos os relacionamentos foram incluídos
      expect(queryBuilder.innerJoinAndSelect).toHaveBeenCalledWith('task.project', 'project');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(3);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.reviewer', 'reviewer');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.users', 'users');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.occupations', 'occupations');
    });

    it('should filter out tasks from inactive projects', async () => {
      const tasks = [
        mockTaskFactory({ id: 1, project: mockProjectFactory({ status: true }) }),
        mockTaskFactory({ id: 2, project: mockProjectFactory({ status: false }) }),
      ];
      
      // Mock para retornar apenas tarefas de projetos ativos
      const activeTasks = tasks.filter(task => task.project?.status);
      (mockRepository.createQueryBuilder as jest.Mock)().getMany.mockResolvedValue(activeTasks);

      const result = await strategy.execute(mockRepository as Repository<Task>);

      expect(result).toEqual(activeTasks);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
  });
});