import { TaskStrategyFactory } from '../../src/modules/tasks/strategies/task-strategy.factory';
import { 
  TaskUpdateStrategy,
  RepositoryUpdateStrategy,
  EntityUpdateStrategy 
} from '../../src/modules/tasks/strategies/task-update.strategy';
import { 
  TaskTimerUpdateStrategy,
  RepositoryTimerUpdateStrategy,
  EntityTimerUpdateStrategy 
} from '../../src/modules/tasks/strategies/task-timer-update.strategy';
import { 
  TaskFindAllStrategy,
  RepositoryFindAllStrategy,
  StandardFindAllStrategy 
} from '../../src/modules/tasks/strategies/task-find-all.strategy';
import { ActiveProjectFindAllStrategy } from '../../src/modules/tasks/strategies/active-project-find-all.strategy';
import { Repository } from 'typeorm';
import { Task } from '../../src/modules/tasks/entities/task.entity';

describe('TaskStrategyFactory', () => {
  let factory: TaskStrategyFactory;

  beforeEach(() => {
    factory = new TaskStrategyFactory();
  });

  describe('getUpdateStrategy', () => {
    it('should return EntityUpdateStrategy', () => {
      const mockRepository = {} as Repository<Task>;
      const strategy = factory.getUpdateStrategy(mockRepository);

      expect(strategy).toBeInstanceOf(EntityUpdateStrategy);
    });

    it('should return the first strategy in the list', () => {
      const mockRepository = {} as Repository<Task>;
      const strategy = factory.getUpdateStrategy(mockRepository);

      expect(strategy).toBe(factory['updateStrategies'][0]);
    });

    it('should ignore repository parameter (always returns first strategy)', () => {
      const mockRepository1 = { update: jest.fn() } as Repository<Task>;
      const mockRepository2 = {} as Repository<Task>;

      const strategy1 = factory.getUpdateStrategy(mockRepository1);
      const strategy2 = factory.getUpdateStrategy(mockRepository2);

      expect(strategy1).toBe(strategy2); // mesma instância
      expect(strategy1).toBe(factory['updateStrategies'][0]);
    });

    it('should always return the same instance', () => {
      const mockRepository1 = {} as Repository<Task>;
      const mockRepository2 = {} as Repository<Task>;

      const strategy1 = factory.getUpdateStrategy(mockRepository1);
      const strategy2 = factory.getUpdateStrategy(mockRepository2);

      expect(strategy1).toBe(strategy2); // mesma instância criada no constructor
    });
  });

  describe('getTimerUpdateStrategy', () => {
    let mockRepositoryWithUpdate: Partial<Repository<Task>>;
    let mockRepositoryWithoutUpdate: Partial<Repository<Task>>;

    beforeEach(() => {
      mockRepositoryWithUpdate = { update: jest.fn() };
      mockRepositoryWithoutUpdate = {};
    });

    it('should return RepositoryTimerUpdateStrategy when repository has update method', () => {
      const strategy = factory.getTimerUpdateStrategy(mockRepositoryWithUpdate as Repository<Task>);

      expect(strategy).toBeInstanceOf(RepositoryTimerUpdateStrategy);
    });

    it('should return EntityTimerUpdateStrategy when repository does not have update method', () => {
      const strategy = factory.getTimerUpdateStrategy(mockRepositoryWithoutUpdate as Repository<Task>);

      expect(strategy).toBeInstanceOf(EntityTimerUpdateStrategy);
    });

    it('should call canHandle on each strategy', () => {
      // Mock para verificar se canHandle foi chamado
      const strategies = factory['timerUpdateStrategies'];
      strategies.forEach(strategy => {
        strategy.canHandle = jest.fn();
      });

      // Configurar o primeiro para retornar true
      strategies[0].canHandle.mockReturnValue(true);

      const strategy = factory.getTimerUpdateStrategy(mockRepositoryWithUpdate as Repository<Task>);
      
      expect(strategies[0].canHandle).toHaveBeenCalledWith(mockRepositoryWithUpdate);
      expect(strategy).toBeInstanceOf(RepositoryTimerUpdateStrategy);
    });

    it('should return fallback strategy when no strategy can handle', () => {
      // Mock para todas as estratégias retornarem false
      const strategies = factory['timerUpdateStrategies'];
      strategies.forEach(strategy => {
        strategy.canHandle = jest.fn().mockReturnValue(false);
      });

      const strategy = factory.getTimerUpdateStrategy(mockRepositoryWithUpdate as Repository<Task>);
      
      expect(strategy).toBe(strategies[1]); // fallback
      expect(strategy).toBeInstanceOf(EntityTimerUpdateStrategy);
    });

    it('should return same instance for same repository type', () => {
      const strategy1 = factory.getTimerUpdateStrategy(mockRepositoryWithUpdate as Repository<Task>);
      const strategy2 = factory.getTimerUpdateStrategy(mockRepositoryWithUpdate as Repository<Task>);

      expect(strategy1).toBe(strategy2); // mesma instância do array
    });

    it('should handle null or undefined repository', () => {
      const strategy = factory.getTimerUpdateStrategy(null as any);
      
      expect(strategy).toBeInstanceOf(EntityTimerUpdateStrategy);
    });
  });

  describe('getFindAllStrategy', () => {
    let mockRepositoryWithFindAll: Partial<Repository<Task>>;
    let mockRepositoryWithoutFindAll: Partial<Repository<Task>>;

    beforeEach(() => {
      mockRepositoryWithFindAll = { findAll: jest.fn() };
      mockRepositoryWithoutFindAll = {};
    });

    it('should return RepositoryFindAllStrategy when repository has findAll method', () => {
      const strategy = factory.getFindAllStrategy(mockRepositoryWithFindAll as Repository<Task>);

      expect(strategy).toBeInstanceOf(RepositoryFindAllStrategy);
    });

    it('should return ActiveProjectFindAllStrategy when repository does not have findAll method', () => {
      const strategy = factory.getFindAllStrategy(mockRepositoryWithoutFindAll as Repository<Task>);

      expect(strategy).toBeInstanceOf(ActiveProjectFindAllStrategy);
    });

    it('should call canHandle on each strategy', () => {
      // Mock para verificar se canHandle foi chamado
      const strategies = factory['findAllStrategies'];
      strategies.forEach(strategy => {
        const originalCanHandle = strategy.canHandle;
        strategy.canHandle = jest.fn().mockImplementation(originalCanHandle.bind(strategy));
      });

      const strategy = factory.getFindAllStrategy(mockRepositoryWithoutFindAll as Repository<Task>);
      
      // Should have called canHandle on the first strategy
      expect(strategies[0].canHandle).toHaveBeenCalledWith(mockRepositoryWithoutFindAll);
      expect(strategy).toBe(strategies[1]); // fallback
    });

    it('should use RepositoryFindAllStrategy when it can handle', () => {
      const strategy = factory.getFindAllStrategy(mockRepositoryWithFindAll as Repository<Task>);
      
      expect(strategy).toBeInstanceOf(RepositoryFindAllStrategy);
      expect(strategy).toBe(factory['findAllStrategies'][0]);
    });

    it('should return fallback when no strategy can handle', () => {
      // Mock para o RepositoryFindAllStrategy retornar false
      const repositoryStrategy = factory['findAllStrategies'][0];
      const originalCanHandle = repositoryStrategy.canHandle;
      repositoryStrategy.canHandle = jest.fn().mockReturnValue(false);

      const strategy = factory.getFindAllStrategy(mockRepositoryWithFindAll as Repository<Task>);
      
      expect(strategy).toBe(factory['findAllStrategies'][1]); // fallback
      expect(strategy).toBeInstanceOf(ActiveProjectFindAllStrategy);
      
      // Restaurar o método original
      repositoryStrategy.canHandle = originalCanHandle;
    });

    it('should return same instance for same repository type', () => {
      const strategy1 = factory.getFindAllStrategy(mockRepositoryWithFindAll as Repository<Task>);
      const strategy2 = factory.getFindAllStrategy(mockRepositoryWithFindAll as Repository<Task>);

      expect(strategy1).toBe(strategy2); // mesma instância do array
    });

    it('should handle repository with findAll that returns false', () => {
      const mockRepository = { findAll: jest.fn() };
      
      // Mock para RepositoryFindAllStrategy retornar false mesmo com findAll
      const strategies = factory['findAllStrategies'];
      strategies[0].canHandle = jest.fn().mockReturnValue(false);

      const strategy = factory.getFindAllStrategy(mockRepository as Repository<Task>);
      
      expect(strategy).toBe(strategies[1]); // fallback
      expect(strategy).toBeInstanceOf(ActiveProjectFindAllStrategy);
    });
  });

  describe('strategy initialization', () => {
    it('should initialize update strategies correctly', () => {
      expect(factory['updateStrategies']).toHaveLength(1);
      expect(factory['updateStrategies'][0]).toBeInstanceOf(EntityUpdateStrategy);
    });

    it('should initialize timer update strategies correctly', () => {
      expect(factory['timerUpdateStrategies']).toHaveLength(2);
      expect(factory['timerUpdateStrategies'][0]).toBeInstanceOf(RepositoryTimerUpdateStrategy);
      expect(factory['timerUpdateStrategies'][1]).toBeInstanceOf(EntityTimerUpdateStrategy);
    });

    it('should initialize find all strategies correctly', () => {
      expect(factory['findAllStrategies']).toHaveLength(2);
      expect(factory['findAllStrategies'][0]).toBeInstanceOf(RepositoryFindAllStrategy);
      expect(factory['findAllStrategies'][1]).toBeInstanceOf(ActiveProjectFindAllStrategy);
    });
  });
});