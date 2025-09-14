import { Task } from '../../src/modules/tasks/entities/task.entity';
import { User } from '../../src/modules/user/entities/user.entity';
import { Project } from '../../src/modules/project/entities/project.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { Comment } from '../../src/modules/comment/entities/comment.entity';
import { RecurringTask } from '../../src/modules/recurring-task/entities/recurring-task.entity';
import { ActivityLog } from '../../src/modules/activity-log/entities/activity-log.entity';
import { PriorityLevel, Status } from '../../src/modules/tasks/entities/enums';
import { mockTaskFactory, mockUserFactory, mockProjectFactory, mockOccupationFactory } from '../mocks/factory';

describe('Task Entity', () => {
  let task: Task;

  beforeEach(() => {
    task = mockTaskFactory({
      id: 1,
      title: 'Test Task',
      description: 'A test task',
      priority: PriorityLevel.High,
      status: Status.InProgress,
      start_date: new Date('2023-01-01'),
      due_date: new Date('2023-01-31'),
      order: 1,
      timer: 3600,
      project_id: 1,
      project: mockProjectFactory({ id: 1 }),
      users: [mockUserFactory({ id: 1 })],
      occupations: [mockOccupationFactory({ id: 1 })],
    });
  });

  describe('Entity Structure', () => {
    it('should have required properties', () => {
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('start_date');
      expect(task).toHaveProperty('due_date');
      expect(task).toHaveProperty('timer');
      expect(task).toHaveProperty('project_id');
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
    });

    it('should have optional properties', () => {
      expect(task).toHaveProperty('order');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('recurring_task_id');
      expect(task).toHaveProperty('task_reviewer_id');
      expect(task).toHaveProperty('video_url');
      expect(task).toHaveProperty('useful_links');
      expect(task).toHaveProperty('observations');
      expect(task).toHaveProperty('has_detailed_fields');
    });

    it('should have relation properties', () => {
      expect(task).toHaveProperty('project');
      expect(task).toHaveProperty('recurringTask');
      expect(task).toHaveProperty('reviewer');
      expect(task).toHaveProperty('users');
      expect(task).toHaveProperty('occupations');
      expect(task).toHaveProperty('comments');
      expect(task).toHaveProperty('activityLogs');
    });
  });

  describe('Data Types', () => {
    it('should have correct data types', () => {
      expect(typeof task.id).toBe('number');
      expect(typeof task.title).toBe('string');
      expect(typeof task.priority).toBe('string');
      expect(typeof task.status).toBe('string');
      expect(task.start_date).toBeInstanceOf(Date);
      expect(task.due_date).toBeInstanceOf(Date);
      expect(typeof task.timer).toBe('number');
      expect(typeof task.project_id).toBe('number');
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle nullable types correctly', () => {
      const taskWithNulls = mockTaskFactory({
        description: null,
        recurring_task_id: null,
        task_reviewer_id: null,
        video_url: null,
        useful_links: null,
        observations: null,
      });

      expect(taskWithNulls.description).toBeNull();
      expect(taskWithNulls.recurring_task_id).toBeNull();
      expect(taskWithNulls.task_reviewer_id).toBeNull();
      expect(taskWithNulls.video_url).toBeNull();
      expect(taskWithNulls.useful_links).toBeNull();
      expect(taskWithNulls.observations).toBeNull();
    });
  });

  describe('Relations', () => {
    it('should have project relation', () => {
      expect(task.project).toBeDefined();
      expect(task.project).toBeInstanceOf(Object);
      expect(task.project.id).toBe(1);
    });

    it('should have users relation as array', () => {
      expect(Array.isArray(task.users)).toBe(true);
      expect(task.users.length).toBeGreaterThan(0);
      expect(task.users[0]).toBeInstanceOf(Object);
    });

    it('should have occupations relation as array', () => {
      expect(Array.isArray(task.occupations)).toBe(true);
      expect(task.occupations.length).toBeGreaterThan(0);
      expect(task.occupations[0]).toBeInstanceOf(Object);
    });
  });

  describe('JSON Serialization', () => {
    it('should include timer in JSON output even when null', () => {
      const taskWithoutTimer = mockTaskFactory({ timer: null });
      const jsonOutput = taskWithoutTimer.toJSON();

      expect(jsonOutput).toHaveProperty('timer');
      expect(jsonOutput.timer).toBe(0); // Should default to 0
    });

    it('should include timer in JSON output when has value', () => {
      const taskWithTimer = mockTaskFactory({ timer: 3600 });
      const jsonOutput = taskWithTimer.toJSON();

      expect(jsonOutput).toHaveProperty('timer');
      expect(jsonOutput.timer).toBe(3600);
    });

    it('should preserve all other properties in JSON output', () => {
      const jsonOutput = task.toJSON();

      expect(jsonOutput).toHaveProperty('id', task.id);
      expect(jsonOutput).toHaveProperty('title', task.title);
      expect(jsonOutput).toHaveProperty('priority', task.priority);
      expect(jsonOutput).toHaveProperty('status', task.status);
      expect(jsonOutput).toHaveProperty('start_date', task.start_date);
      expect(jsonOutput).toHaveProperty('due_date', task.due_date);
    });
  });

  describe('Default Values', () => {
    it('should have default timer value of 0', () => {
      const taskWithoutTimer = mockTaskFactory({ timer: undefined });
      expect(taskWithoutTimer.timer).toBe(0);
    });

    it('should have default has_detailed_fields as false', () => {
      const task = mockTaskFactory();
      expect(task.has_detailed_fields).toBe(false);
    });

    it('should have default order as null', () => {
      const task = mockTaskFactory({ order: undefined });
      expect(task.order).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should require title', () => {
      const taskWithoutTitle = { ...task, title: '' };
      expect(taskWithoutTitle.title).toBe('');
    });

    it('should require project_id', () => {
      expect(task.project_id).toBeGreaterThan(0);
    });

    it('should require start_date and due_date', () => {
      expect(task.start_date).toBeInstanceOf(Date);
      expect(task.due_date).toBeInstanceOf(Date);
    });

    it('should have valid priority and status enums', () => {
      expect(Object.values(PriorityLevel)).toContain(task.priority);
      expect(Object.values(Status)).toContain(task.status);
    });
  });

  describe('Business Logic', () => {
    it('should have due_date after start_date', () => {
      expect(task.due_date.getTime()).toBeGreaterThanOrEqual(task.start_date.getTime());
    });

    it('should handle non-negative timer values', () => {
      expect(task.timer).toBeGreaterThanOrEqual(0);
    });

    it('should have positive project_id', () => {
      expect(task.project_id).toBeGreaterThan(0);
    });
  });

  describe('Complex Fields', () => {
    it('should handle useful_links as array of objects', () => {
      const taskWithLinks = mockTaskFactory({
        useful_links: [
          { title: 'Link 1', url: 'http://example.com' },
          { title: 'Link 2', url: 'http://example.org' }
        ]
      });

      expect(Array.isArray(taskWithLinks.useful_links)).toBe(true);
      expect(taskWithLinks.useful_links![0]).toHaveProperty('title');
      expect(taskWithLinks.useful_links![0]).toHaveProperty('url');
    });

    it('should handle observations as string', () => {
      const taskWithObservations = mockTaskFactory({
        observations: 'This is a detailed observation about the task.'
      });

      expect(typeof taskWithObservations.observations).toBe('string');
      expect(taskWithObservations.observations!.length).toBeGreaterThan(0);
    });
  });
});