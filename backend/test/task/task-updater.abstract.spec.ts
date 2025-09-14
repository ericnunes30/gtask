import { TaskUpdater } from '../../src/modules/tasks/services/task-updater.abstract';
import { UpdateTaskDto } from '../../src/modules/tasks/dto/update-task.dto';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { mockTaskFactory } from '../mocks/factory';
import { NotFoundException } from '@nestjs/common';

describe('TaskUpdater Abstract Class', () => {
  describe('Abstract Method Definition', () => {
    it('should define update method with correct signature', () => {
      // Test that the abstract method exists with correct parameters
      expect(TaskUpdater.prototype.update).toBeDefined();
      expect(typeof TaskUpdater.prototype.update).toBe('function');
    });

    it('should indicate abstract nature through missing implementation', () => {
      // In TypeScript, abstract classes can be instantiated at runtime but will throw when abstract methods are called
      const taskUpdater = new (TaskUpdater as any)();
      expect(typeof taskUpdater.update).toBe('function'); // Method exists but will throw when called
    });

    it('should have update method that returns Promise<Task>', async () => {
      // Create a concrete implementation for testing
      class TestTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          if (id === 999) {
            throw new NotFoundException('Task not found');
          }
          return mockTaskFactory({ ...updateTaskDto, id });
        }
      }

      const testUpdater = new TestTaskUpdater();
      const updateTaskDto = { title: 'Updated Task' };
      const id = 1;
      const userId = 1;

      const result = await testUpdater.update(id, updateTaskDto, userId);

      expect(result).toBeInstanceOf(Object);
      expect(result.id).toBe(id);
      expect(result.title).toBe(updateTaskDto.title);
    });
  });

  describe('Method Parameters', () => {
    it('should accept task id as first parameter', async () => {
      class TestTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ id, title: `Task ${id}` });
        }
      }

      const testUpdater = new TestTaskUpdater();

      const result1 = await testUpdater.update(1, {}, 1);
      const result2 = await testUpdater.update(42, {}, 1);

      expect(result1.id).toBe(1);
      expect(result1.title).toBe('Task 1');
      expect(result2.id).toBe(42);
      expect(result2.title).toBe('Task 42');
    });

    it('should accept UpdateTaskDto as second parameter', async () => {
      class TestTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const testUpdater = new TestTaskUpdater();
      const updateTaskDto: UpdateTaskDto = {
        title: 'New Title',
        status: 'concluido' as any,
        priority: 'alta' as any,
      };

      const result = await testUpdater.update(1, updateTaskDto, 1);

      expect(result.title).toBe('New Title');
      expect(result.status).toBe('concluido');
      expect(result.priority).toBe('alta');
    });

    it('should accept userId as third parameter', async () => {
      class TestTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const testUpdater = new TestTaskUpdater();
      const updateTaskDto = { title: 'Updated by User' };

      // Test different user IDs
      const result1 = await testUpdater.update(1, updateTaskDto, 1);
      const result2 = await testUpdater.update(1, updateTaskDto, 42);

      // Both should succeed (userId might be used for logging/audit purposes)
      expect(result1.title).toBe('Updated by User');
      expect(result2.title).toBe('Updated by User');
    });

    it('should handle partial updates', async () => {
      class TestTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const testUpdater = new TestTaskUpdater();

      // Update only title
      const result1 = await testUpdater.update(1, { title: 'Only Title' }, 1);
      expect(result1.title).toBe('Only Title');

      // Update only status
      const result2 = await testUpdater.update(1, { status: 'concluido' as any }, 1);
      expect(result2.status).toBe('concluido');

      // Update only priority
      const result3 = await testUpdater.update(1, { priority: 'urgente' as any }, 1);
      expect(result3.priority).toBe('urgente');

      // Empty update (should not throw)
      const result4 = await testUpdater.update(1, {}, 1);
      expect(result4).toBeDefined();
    });
  });

  describe('Return Type', () => {
    it('should return Promise<Task>', async () => {
      class TestTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const testUpdater = new TestTaskUpdater();
      const result = testUpdater.update(1, { title: 'Test' }, 1);

      expect(result).toBeInstanceOf(Promise);
      const resolvedResult = await result;
      expect(resolvedResult).toHaveProperty('id');
      expect(resolvedResult).toHaveProperty('title');
      expect(resolvedResult).toHaveProperty('status');
    });

    it('should return complete task with all properties', async () => {
      class TestTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const testUpdater = new TestTaskUpdater();
      const result = await testUpdater.update(1, { title: 'Complete Task' }, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('title', 'Complete Task');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('start_date');
      expect(result).toHaveProperty('due_date');
      expect(result).toHaveProperty('timer');
      expect(result).toHaveProperty('project_id');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('Error Handling', () => {
    it('should allow throwing errors for non-existent tasks', async () => {
      class NotFoundTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          throw new NotFoundException(`Task with ID ${id} not found`);
        }
      }

      const notFoundUpdater = new NotFoundTaskUpdater();

      await expect(notFoundUpdater.update(999, { title: 'Test' }, 1))
        .rejects.toThrow(NotFoundException);
    });

    it('should allow throwing validation errors', async () => {
      class ValidationTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          if (updateTaskDto.title && updateTaskDto.title.length > 255) {
            throw new Error('Title too long');
          }
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const validator = new ValidationTaskUpdater();

      // Valid case
      const validResult = await validator.update(1, { title: 'Valid' }, 1);
      expect(validResult).toBeDefined();

      // Invalid case
      await expect(validator.update(1, { title: 'a'.repeat(256) }, 1))
        .rejects.toThrow('Title too long');
    });

    it('should handle database errors gracefully', async () => {
      class DatabaseErrorTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          throw new Error('Database connection failed');
        }
      }

      const dbErrorUpdater = new DatabaseErrorTaskUpdater();

      await expect(dbErrorUpdater.update(1, { title: 'Test' }, 1))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('Business Logic', () => {
    it('should prevent updates to completed tasks', async () => {
      class BusinessLogicTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          // Simulate fetching current task state
          const currentTask = mockTaskFactory({ id, status: 'concluido' as any });
          
          if (currentTask.status === 'concluido') {
            throw new Error('Cannot update completed tasks');
          }
          
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const businessUpdater = new BusinessLogicTaskUpdater();

      await expect(businessUpdater.update(1, { title: 'Update completed task' }, 1))
        .rejects.toThrow('Cannot update completed tasks');
    });

    it('should validate status transitions', async () => {
      class StatusTransitionTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          const currentTask = mockTaskFactory({ id, status: 'pendente' as any });
          
          if (updateTaskDto.status === 'concluido' && currentTask.status !== 'em_revisao') {
            throw new Error('Tasks must be in review before completion');
          }
          
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const transitionUpdater = new StatusTransitionTaskUpdater();

      // Invalid transition
      await expect(transitionUpdater.update(1, { status: 'concluido' as any }, 1))
        .rejects.toThrow('Tasks must be in review before completion');

      // Valid transition (if we simulate current task being in review)
      class ValidTransitionTaskUpdater extends StatusTransitionTaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          const currentTask = mockTaskFactory({ id, status: 'em_revisao' as any });
          
          if (updateTaskDto.status === 'concluido' && currentTask.status !== 'em_revisao') {
            throw new Error('Tasks must be in review before completion');
          }
          
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const validTransitionUpdater = new ValidTransitionTaskUpdater();
      const result = await validTransitionUpdater.update(1, { status: 'concluido' as any }, 1);
      expect(result.status).toBe('concluido');
    });
  });

  describe('Implementation Patterns', () => {
    it('should support decorator pattern for audit logging', async () => {
      class BaseTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      class AuditLoggingTaskUpdater extends TaskUpdater {
        constructor(private base: BaseTaskUpdater) {
          super();
        }

        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          console.log(`User ${userId} updating task ${id}`, updateTaskDto);
          const result = await this.base.update(id, updateTaskDto, userId);
          console.log(`Task ${id} updated successfully`);
          return result;
        }
      }

      const base = new BaseTaskUpdater();
      const auditUpdater = new AuditLoggingTaskUpdater(base);

      const result = await auditUpdater.update(1, { title: 'Audit Test' }, 1);
      expect(result.title).toBe('Audit Test');
    });

    it('should support permission checking', async () => {
      class PermissionTaskUpdater extends TaskUpdater {
        async update(id: number, updateTaskDto: UpdateTaskDto, userId: number): Promise<Task> {
          if (userId !== 1) { // Simulate admin check
            throw new Error('Permission denied');
          }
          return mockTaskFactory({ id, ...updateTaskDto });
        }
      }

      const permissionUpdater = new PermissionTaskUpdater();

      // Admin user
      const adminResult = await permissionUpdater.update(1, { title: 'Admin Update' }, 1);
      expect(adminResult.title).toBe('Admin Update');

      // Non-admin user
      await expect(permissionUpdater.update(1, { title: 'User Update' }, 2))
        .rejects.toThrow('Permission denied');
    });
  });
});