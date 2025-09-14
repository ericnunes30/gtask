import { TaskOperationStrategy } from '../../src/modules/tasks/strategies/task-operation-strategy.interface';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockTaskFactory } from '../mocks/factory';

describe('TaskOperationStrategy Interface', () => {
  describe('Interface Definition', () => {
    it('should require canHandle method in implementations', () => {
      // Test that implementations must define canHandle method
      class TestStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return true;
        }

        execute(data: any): Promise<Task | Task[] | void> {
          return Promise.resolve(mockTaskFactory());
        }
      }

      const strategy = new TestStrategy();
      expect(typeof strategy.canHandle).toBe('function');
    });

    it('should require execute method in implementations', () => {
      // Test that implementations must define execute method
      class TestStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return true;
        }

        execute(data: any): Promise<Task | Task[] | void> {
          return Promise.resolve(mockTaskFactory());
        }
      }

      const strategy = new TestStrategy();
      expect(typeof strategy.execute).toBe('function');
    });

    it('should validate interface contract', () => {
      // Test that interface enforces method signatures
      const validStrategy = {
        canHandle: (repository: any): boolean => true,
        execute: (data: any): Promise<Task | Task[] | void> => Promise.resolve(mockTaskFactory()),
      };

      expect(typeof validStrategy.canHandle).toBe('function');
      expect(typeof validStrategy.execute).toBe('function');
    });
  });

  describe('Method Signatures', () => {
    it('canHandle should accept repository parameter and return boolean', () => {
      class TestStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          expect(repository).toBeDefined();
          return typeof repository.find === 'function';
        }

        execute(data: any): Promise<Task | Task[] | void> {
          return Promise.resolve(mockTaskFactory());
        }
      }

      const strategy = new TestStrategy();

      // Test with repository that has find method
      const repoWithFind = { find: jest.fn() };
      expect(strategy.canHandle(repoWithFind)).toBe(true);

      // Test with repository that doesn't have find method
      const repoWithoutFind = {};
      expect(strategy.canHandle(repoWithoutFind)).toBe(false);
    });

    it('execute should accept data parameter and return Promise with union type', async () => {
      class TestStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return true;
        }

        async execute(data: any): Promise<Task | Task[] | void> {
          expect(data).toBeDefined();
          
          // Test different return types
          if (data.returnType === 'single') {
            return mockTaskFactory({ id: data.id });
          } else if (data.returnType === 'array') {
            return [mockTaskFactory({ id: 1 }), mockTaskFactory({ id: 2 })];
          } else if (data.returnType === 'void') {
            return undefined;
          }
          
          return mockTaskFactory();
        }
      }

      const strategy = new TestStrategy();

      // Test single task return
      const singleResult = await strategy.execute({ id: 1, returnType: 'single' });
      if (singleResult) {
        expect((singleResult as Task).id).toBe(1);
      }

      // Test array return
      const arrayResult = await strategy.execute({ returnType: 'array' });
      if (Array.isArray(arrayResult)) {
        expect(arrayResult).toHaveLength(2);
      }

      // Test void return
      const voidResult = await strategy.execute({ returnType: 'void' });
      expect(voidResult).toBeUndefined();
    });
  });

  describe('Implementation Patterns', () => {
    it('should support strategy pattern for different operations', () => {
      class CreateStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return typeof repository.create === 'function';
        }

        async execute(data: any): Promise<Task> {
          return mockTaskFactory({ title: data.title });
        }
      }

      class FindStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return typeof repository.find === 'function';
        }

        async execute(data: any): Promise<Task[]> {
          return [mockTaskFactory({ id: data.id })];
        }
      }

      class UpdateStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return typeof repository.update === 'function';
        }

        async execute(data: any): Promise<void> {
          // Update operation returns nothing
        }
      }

      const strategies = [
        new CreateStrategy(),
        new FindStrategy(),
        new UpdateStrategy(),
      ];

      const repo = { create: jest.fn(), find: jest.fn(), update: jest.fn() };

      strategies.forEach(strategy => {
        expect(strategy.canHandle(repo)).toBe(true);
        expect(typeof strategy.execute).toBe('function');
      });
    });

    it('should allow selective handling based on repository capabilities', () => {
      class DatabaseStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return repository.connection && repository.connection.database === 'postgres';
        }

        async execute(data: any): Promise<Task> {
          return mockTaskFactory({ title: 'PostgreSQL Task' });
        }
      }

      class MemoryStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return repository.type === 'memory';
        }

        async execute(data: any): Promise<Task> {
          return mockTaskFactory({ title: 'Memory Task' });
        }
      }

      const dbStrategy = new DatabaseStrategy();
      const memoryStrategy = new MemoryStrategy();

      const postgresRepo = { connection: { database: 'postgres' } };
      const memoryRepo = { type: 'memory' };
      const otherRepo = { connection: { database: 'mysql' } };

      expect(dbStrategy.canHandle(postgresRepo)).toBe(true);
      expect(dbStrategy.canHandle(memoryRepo)).toBe(false);
      expect(dbStrategy.canHandle(otherRepo)).toBe(false);

      expect(memoryStrategy.canHandle(memoryRepo)).toBe(true);
      expect(memoryStrategy.canHandle(postgresRepo)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should allow strategies to throw errors', async () => {
      class ErrorStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return true;
        }

        async execute(data: any): Promise<Task> {
          throw new Error('Strategy execution failed');
        }
      }

      const errorStrategy = new ErrorStrategy();

      await expect(errorStrategy.execute({}))
        .rejects.toThrow('Strategy execution failed');
    });

    it('should allow strategies to handle different error scenarios', async () => {
      class RobustStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return true;
        }

        async execute(data: any): Promise<Task | void> {
          if (data.shouldFail) {
            throw new Error('Intentional failure');
          }
          
          if (data.shouldReturnVoid) {
            return undefined;
          }
          
          return mockTaskFactory({ title: data.title || 'Default Title' });
        }
      }

      const robustStrategy = new RobustStrategy();

      // Normal operation
      const normalResult = await robustStrategy.execute({ title: 'Normal' });
      expect((normalResult as Task).title).toBe('Normal');

      // Void operation
      const voidResult = await robustStrategy.execute({ shouldReturnVoid: true });
      expect(voidResult).toBeUndefined();

      // Error operation
      await expect(robustStrategy.execute({ shouldFail: true }))
        .rejects.toThrow('Intentional failure');
    });
  });

  describe('Type Safety', () => {
    it('should work with TypeScript type inference', () => {
      class TypeSafeStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          // TypeScript should infer repository type
          return typeof repository === 'object';
        }

        async execute(data: any): Promise<Task | Task[] | void> {
          // TypeScript should allow all return types
          if (Array.isArray(data)) {
            return data.map(item => mockTaskFactory(item));
          } else if (data === null) {
            return undefined;
          } else {
            return mockTaskFactory(data);
          }
        }
      }

      const typeSafeStrategy = new TypeSafeStrategy();
      const repo = {};

      expect(typeSafeStrategy.canHandle(repo)).toBe(true);
    });

    it('should support generic-like behavior', async () => {
      class FlexibleStrategy implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return true;
        }

        async execute(data: any): Promise<Task | Task[] | void> {
          // Simulate generic behavior
          if (data.operation === 'create') {
            return mockTaskFactory(data.taskData);
          } else if (data.operation === 'find') {
            return [mockTaskFactory({ id: 1 }), mockTaskFactory({ id: 2 })];
          } else if (data.operation === 'delete') {
            return; // void
          }
          
          throw new Error('Unknown operation');
        }
      }

      const flexibleStrategy = new FlexibleStrategy();

      // Test different operations
      const createResult = await flexibleStrategy.execute({
        operation: 'create',
        taskData: { title: 'New Task' }
      });
      expect((createResult as Task).title).toBe('New Task');

      const findResult = await flexibleStrategy.execute({ operation: 'find' });
      expect(Array.isArray(findResult)).toBe(true);
      expect((findResult as Task[]).length).toBe(2);

      const deleteResult = await flexibleStrategy.execute({ operation: 'delete' });
      expect(deleteResult).toBeUndefined();

      await expect(flexibleStrategy.execute({ operation: 'unknown' }))
        .rejects.toThrow('Unknown operation');
    });
  });

  describe('Integration Potential', () => {
    it('should work well with factory pattern', () => {
      class StrategyFactory {
        private strategies: TaskOperationStrategy[] = [];

        addStrategy(strategy: TaskOperationStrategy): void {
          this.strategies.push(strategy);
        }

        getStrategy(repository: any): TaskOperationStrategy | undefined {
          return this.strategies.find(strategy => strategy.canHandle(repository));
        }
      }

      class TestStrategy1 implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return repository.type === 'test1';
        }

        async execute(data: any): Promise<Task> {
          return mockTaskFactory({ title: 'Strategy 1' });
        }
      }

      class TestStrategy2 implements TaskOperationStrategy {
        canHandle(repository: any): boolean {
          return repository.type === 'test2';
        }

        async execute(data: any): Promise<Task> {
          return mockTaskFactory({ title: 'Strategy 2' });
        }
      }

      const factory = new StrategyFactory();
      factory.addStrategy(new TestStrategy1());
      factory.addStrategy(new TestStrategy2());

      const repo1 = { type: 'test1' };
      const repo2 = { type: 'test2' };
      const repo3 = { type: 'unknown' };

      const strategy1 = factory.getStrategy(repo1);
      const strategy2 = factory.getStrategy(repo2);
      const strategy3 = factory.getStrategy(repo3);

      expect(strategy1).toBeInstanceOf(TestStrategy1);
      expect(strategy2).toBeInstanceOf(TestStrategy2);
      expect(strategy3).toBeUndefined();
    });
  });
});