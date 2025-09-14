import { TaskCreator } from '../../src/modules/tasks/services/task-creator.abstract';
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockCreateTaskDtoFactory, mockTaskFactory } from '../mocks/factory';

describe('TaskCreator Abstract Class', () => {
  describe('Abstract Method Definition', () => {
    it('should define create method with correct signature', () => {
      // Test that the abstract method exists with correct parameters
      expect(TaskCreator.prototype.create).toBeDefined();
      expect(typeof TaskCreator.prototype.create).toBe('function');
    });

    it('should indicate abstract nature through missing implementation', () => {
      // In TypeScript, abstract classes can be instantiated at runtime but will throw when abstract methods are called
      const taskCreator = new (TaskCreator as any)();
      expect(typeof taskCreator.create).toBe('function'); // Method exists but will throw when called
    });

    it('should have create method that returns Promise<Task>', async () => {
      // Create a concrete implementation for testing
      class TestTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ ...createTaskDto, id: userId });
        }
      }

      const testCreator = new TestTaskCreator();
      const createTaskDto = mockCreateTaskDtoFactory();
      const userId = 1;

      const result = await testCreator.create(createTaskDto, userId);

      expect(result).toBeInstanceOf(Object);
      expect(result.id).toBe(userId);
      expect(result.title).toBe(createTaskDto.title);
    });
  });

  describe('Method Parameters', () => {
    it('should accept CreateTaskDto as first parameter', async () => {
      class TestTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ ...createTaskDto, id: 1 });
        }
      }

      const testCreator = new TestTaskCreator();
      const createTaskDto = mockCreateTaskDtoFactory();

      // Should not throw type error
      const result = await testCreator.create(createTaskDto, 1);
      expect(result.title).toBe(createTaskDto.title);
    });

    it('should accept userId as second parameter', async () => {
      class TestTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ ...createTaskDto, id: userId });
        }
      }

      const testCreator = new TestTaskCreator();
      const createTaskDto = mockCreateTaskDtoFactory();
      const userId = 42;

      const result = await testCreator.create(createTaskDto, userId);
      expect(result.id).toBe(userId);
    });

    it('should handle different userId values', async () => {
      class TestTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ ...createTaskDto, id: userId });
        }
      }

      const testCreator = new TestTaskCreator();
      const createTaskDto = mockCreateTaskDtoFactory();

      const result1 = await testCreator.create(createTaskDto, 1);
      const result2 = await testCreator.create(createTaskDto, 2);
      const result3 = await testCreator.create(createTaskDto, 999);

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);
      expect(result3.id).toBe(999);
    });
  });

  describe('Return Type', () => {
    it('should return Promise<Task>', async () => {
      class TestTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ ...createTaskDto, id: userId });
        }
      }

      const testCreator = new TestTaskCreator();
      const result = testCreator.create(mockCreateTaskDtoFactory(), 1);

      expect(result).toBeInstanceOf(Promise);
      const resolvedResult = await result;
      expect(resolvedResult).toHaveProperty('id');
      expect(resolvedResult).toHaveProperty('title');
      expect(resolvedResult).toHaveProperty('status');
    });

    it('should allow different Task implementations', async () => {
      class TestTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          // Create a task with additional custom properties
          return {
            ...mockTaskFactory({ ...createTaskDto, id: userId }),
            // @ts-expect-error - Testing extensibility
            customProperty: 'test',
          };
        }
      }

      const testCreator = new TestTaskCreator();
      const result = await testCreator.create(mockCreateTaskDtoFactory(), 1);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      // @ts-expect-error - Testing that additional properties can be added
      expect(result.customProperty).toBe('test');
    });
  });

  describe('Error Handling', () => {
    it('should allow throwing errors from implementation', async () => {
      class ErrorTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          throw new Error('Creation failed');
        }
      }

      const errorCreator = new ErrorTaskCreator();

      await expect(errorCreator.create(mockCreateTaskDtoFactory(), 1))
        .rejects.toThrow('Creation failed');
    });

    it('should allow rejection of promise', async () => {
      class RejectionTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          return Promise.reject(new Error('Promise rejected'));
        }
      }

      const rejectionCreator = new RejectionTaskCreator();

      await expect(rejectionCreator.create(mockCreateTaskDtoFactory(), 1))
        .rejects.toThrow('Promise rejected');
    });
  });

  describe('Implementation Patterns', () => {
    it('should support decorator pattern', async () => {
      class BaseTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ ...createTaskDto, id: userId });
        }
      }

      class LoggingTaskCreator extends TaskCreator {
        constructor(private base: BaseTaskCreator) {
          super();
        }

        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          console.log('Creating task:', createTaskDto.title);
          const result = await this.base.create(createTaskDto, userId);
          console.log('Task created with ID:', result.id);
          return result;
        }
      }

      const base = new BaseTaskCreator();
      const loggingCreator = new LoggingTaskCreator(base);

      const result = await loggingCreator.create(mockCreateTaskDtoFactory(), 1);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
    });

    it('should support validation in implementation', async () => {
      class ValidatingTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          if (!createTaskDto.title || createTaskDto.title.trim().length === 0) {
            throw new Error('Title is required');
          }
          
          if (userId <= 0) {
            throw new Error('User ID must be positive');
          }

          return mockTaskFactory({ ...createTaskDto, id: userId });
        }
      }

      const validator = new ValidatingTaskCreator();

      // Valid case
      const validResult = await validator.create(mockCreateTaskDtoFactory(), 1);
      expect(validResult).toHaveProperty('id');

      // Invalid cases
      await expect(validator.create({ ...mockCreateTaskDtoFactory(), title: '' }, 1))
        .rejects.toThrow('Title is required');

      await expect(validator.create(mockCreateTaskDtoFactory(), 0))
        .rejects.toThrow('User ID must be positive');
    });
  });

  describe('Type Safety', () => {
    it('should enforce parameter types', () => {
      class TypeSafeTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          // TypeScript should enforce these types
          expect(typeof createTaskDto.title).toBe('string');
          expect(typeof userId).toBe('number');
          
          return mockTaskFactory({ ...createTaskDto, id: userId });
        }
      }

      const creator = new TypeSafeTaskCreator();
      
      // These should compile without type errors
      creator.create(mockCreateTaskDtoFactory(), 1);
    });

    it('should work with type inference', async () => {
      class InferenceTaskCreator extends TaskCreator {
        async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
          const task = mockTaskFactory({ ...createTaskDto, id: userId });
          
          // TypeScript should infer the types correctly
          const title: string = task.title;
          const id: number = task.id;
          const status: string = task.status;
          
          return task;
        }
      }

      const creator = new InferenceTaskCreator();
      const result = await creator.create(mockCreateTaskDtoFactory(), 1);
      
      expect(typeof result.title).toBe('string');
      expect(typeof result.id).toBe('number');
    });
  });
});