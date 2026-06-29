import { Repository } from 'typeorm';
import { ActiveProjectFindAllStrategy } from './active-project-find-all.strategy';
import { Task } from '../entities/task.entity';

const mockQueryBuilder = {
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getQueryAndParameters: jest
    .fn()
    .mockReturnValue({ query: 'SELECT...', parameters: {} }),
  getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
};

const mockRepository = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
} as unknown as jest.Mocked<Repository<Task>>;

describe('ActiveProjectFindAllStrategy', () => {
  let strategy: ActiveProjectFindAllStrategy;

  beforeEach(() => {
    strategy = new ActiveProjectFindAllStrategy();
    jest.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return true', () => {
      expect(strategy.canHandle()).toBe(true);
    });
  });

  describe('execute', () => {
    it('should call query builder and return tasks', async () => {
      const result = await strategy.execute(mockRepository);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'task.project',
        'project',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'task.reviewer',
        'reviewer',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'task.users',
        'users',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'task.occupations',
        'occupations',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.status = :status',
        { status: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.status IS NOT NULL',
      );
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
