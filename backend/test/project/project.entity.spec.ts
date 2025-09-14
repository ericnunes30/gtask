import { Project } from '../../src/modules/project/entities/project.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { User } from '../../src/modules/user/entities/user.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums';
import { mockUserFactory, mockTaskFactory, mockOccupationFactory } from '../mocks/factory';

describe('Project Entity', () => {
  let project: Project;

  beforeEach(() => {
    project = new Project();
    project.id = 1;
    project.title = 'Test Project';
    project.description = 'Test Description';
    project.status = true;
    project.priority = PriorityLevel.High;
    project.start_date = new Date('2024-01-01');
    project.end_date = new Date('2024-12-31');
    project.createdAt = new Date();
    project.updatedAt = new Date();
    project.tasks = [];
    project.users = [];
    project.occupations = [];
  });

  it('should be defined', () => {
    expect(project).toBeDefined();
  });

  describe('properties', () => {
    it('should have an id', () => {
      expect(project.id).toBe(1);
    });

    it('should have a title', () => {
      expect(project.title).toBe('Test Project');
    });

    it('should have a description', () => {
      expect(project.description).toBe('Test Description');
    });

    it('should have a status', () => {
      expect(project.status).toBe(true);
    });

    it('should have a priority', () => {
      expect(project.priority).toBe(PriorityLevel.High);
    });

    it('should have a start_date', () => {
      expect(project.start_date).toEqual(new Date('2024-01-01'));
    });

    it('should have an end_date', () => {
      expect(project.end_date).toEqual(new Date('2024-12-31'));
    });

    it('should have createdAt timestamp', () => {
      expect(project.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt timestamp', () => {
      expect(project.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('relations', () => {
    it('should have tasks relation', () => {
      expect(project.tasks).toBeDefined();
      expect(Array.isArray(project.tasks)).toBe(true);
    });

    it('should have users relation', () => {
      expect(project.users).toBeDefined();
      expect(Array.isArray(project.users)).toBe(true);
    });

    it('should have occupations relation', () => {
      expect(project.occupations).toBeDefined();
      expect(Array.isArray(project.occupations)).toBe(true);
    });

    it('should allow adding tasks to the project', () => {
      const task1 = mockTaskFactory();
      const task2 = mockTaskFactory({ id: 2 });
      
      project.tasks = [task1, task2];
      
      expect(project.tasks).toHaveLength(2);
      expect(project.tasks[0]).toEqual(task1);
      expect(project.tasks[1]).toEqual(task2);
    });

    it('should allow adding users to the project', () => {
      const user1 = mockUserFactory();
      const user2 = mockUserFactory({ id: 2 });
      
      project.users = [user1, user2];
      
      expect(project.users).toHaveLength(2);
      expect(project.users[0]).toEqual(user1);
      expect(project.users[1]).toEqual(user2);
    });

    it('should allow adding occupations to the project', () => {
      const occupation1 = mockOccupationFactory();
      const occupation2 = mockOccupationFactory({ id: 2 });
      
      project.occupations = [occupation1, occupation2];
      
      expect(project.occupations).toHaveLength(2);
      expect(project.occupations[0]).toEqual(occupation1);
      expect(project.occupations[1]).toEqual(occupation2);
    });
  });

  describe('validation', () => {
    it('should accept valid priority levels', () => {
      const validPriorities = Object.values(PriorityLevel);
      
      validPriorities.forEach(priority => {
        project.priority = priority;
        expect(project.priority).toBe(priority);
      });
    });

    it('should handle null description', () => {
      project.description = null;
      expect(project.description).toBeNull();
    });

    it('should handle undefined description', () => {
      project.description = undefined;
      expect(project.description).toBeUndefined();
    });

    it('should handle empty arrays for relations', () => {
      project.tasks = [];
      project.users = [];
      project.occupations = [];
      
      expect(project.tasks).toEqual([]);
      expect(project.users).toEqual([]);
      expect(project.occupations).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'a'.repeat(255);
      project.title = longTitle;
      expect(project.title).toBe(longTitle);
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'a'.repeat(10000);
      project.description = longDescription;
      expect(project.description).toBe(longDescription);
    });

    it('should handle date boundary conditions', () => {
      const veryPastDate = new Date('1900-01-01');
      const veryFutureDate = new Date('2100-12-31');
      
      project.start_date = veryPastDate;
      project.end_date = veryFutureDate;
      
      expect(project.start_date).toEqual(veryPastDate);
      expect(project.end_date).toEqual(veryFutureDate);
    });

    it('should handle same start and end dates', () => {
      const sameDate = new Date('2024-06-15');
      project.start_date = sameDate;
      project.end_date = sameDate;
      
      expect(project.start_date).toEqual(project.end_date);
    });
  });

  describe('timestamp behavior', () => {
    it('should have different createdAt and updatedAt initially', () => {
      const initialProject = new Project();
      initialProject.createdAt = new Date();
      initialProject.updatedAt = new Date(initialProject.createdAt.getTime() + 1000); // 1 second later
      
      expect(initialProject.updatedAt.getTime()).toBeGreaterThan(initialProject.createdAt.getTime());
    });

    it('should allow setting timestamps manually', () => {
      const fixedDate = new Date('2024-01-01T00:00:00.000Z');
      project.createdAt = fixedDate;
      project.updatedAt = fixedDate;
      
      expect(project.createdAt).toEqual(fixedDate);
      expect(project.updatedAt).toEqual(fixedDate);
    });
  });

  describe('serialization', () => {
    it('should be serializable to JSON', () => {
      const jsonProject = JSON.parse(JSON.stringify(project));
      
      expect(jsonProject.id).toBe(project.id);
      expect(jsonProject.title).toBe(project.title);
      expect(jsonProject.description).toBe(project.description);
      expect(jsonProject.status).toBe(project.status);
      expect(jsonProject.priority).toBe(project.priority);
      expect(jsonProject.start_date).toBe(project.start_date.toISOString());
      expect(jsonProject.end_date).toBe(project.end_date.toISOString());
    });

    it('should handle relations serialization', () => {
      const user = mockUserFactory();
      const task = mockTaskFactory();
      const occupation = mockOccupationFactory();
      
      project.users = [user];
      project.tasks = [task];
      project.occupations = [occupation];
      
      const jsonProject = JSON.parse(JSON.stringify(project));
      
      expect(jsonProject.users).toBeDefined();
      expect(jsonProject.tasks).toBeDefined();
      expect(jsonProject.occupations).toBeDefined();
    });
  });
});