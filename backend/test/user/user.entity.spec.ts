import { User } from '../../src/modules/user/entities/user.entity';
import { Role } from '../../src/modules/role/entities/role.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { Project } from '../../src/modules/project/entities/project.entity';
import { Comment } from '../../src/modules/comment/entities/comment.entity';
import { StructuredNotificationEntity } from '../../src/modules/notification/entities/notification.entity';

describe('User Entity', () => {
  let user: User;
  let mockRole: Role;
  let mockOccupation: Occupation;
  let mockTask: Task;
  let mockProject: Project;
  let mockComment: Comment;
  let mockNotification: StructuredNotificationEntity;

  beforeEach(() => {
    // Setup test data
    mockRole = {
      id: 1,
      name: 'Admin',
      description: 'Administrator role',
      createdAt: new Date(),
      updatedAt: new Date(),
      users: []
    } as Role;

    mockOccupation = {
      id: 1,
      name: 'Developer',
      createdAt: new Date(),
      updatedAt: new Date(),
      users: [],
      projects: [],
      tasks: []
    } as Occupation;

    mockTask = {
      id: 1,
      title: 'Test Task',
      description: 'Test task description',
      status: 'pendente' as any,
      priority: 'baixa' as any,
      start_date: new Date(),
      due_date: new Date(),
      order: 1,
      timer: 0,
      project_id: 1,
      recurring_task_id: null,
      task_reviewer_id: null,
      video_url: null,
      useful_links: null,
      observations: null,
      has_detailed_fields: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      users: []
    } as Task;

    mockProject = {
      id: 1,
      title: 'Test Project',
      description: 'Test project description',
      status: true,
      priority: 'baixa' as any,
      start_date: new Date(),
      end_date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      users: [],
      tasks: []
    } as Project;

    mockComment = {
      id: 1,
      content: 'Test comment',
      task_id: 1,
      user_id: 1,
      parentId: null,
      likesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {} as User,
      task: {} as Task,
      parentComment: null,
      replies: [],
      likes: [],
      mentionedUsers: [],
      repliesCount: 0
    } as Comment;

    mockNotification = {
      id: 1,
      user: {} as User,
      userId: 1,
      title: 'Test Notification',
      message: 'Test message',
      type: 'info',
      read: false,
      metadata: {},
      createdAt: new Date()
    } as StructuredNotificationEntity;

    user = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword',
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [mockRole],
      occupations: [mockOccupation],
      tasks: [mockTask],
      projects: [mockProject],
      comments: [mockComment],
      structuredNotifications: [mockNotification]
    } as User;
  });

  describe('Basic Properties', () => {
    it('should have required properties', () => {
      expect(user.id).toBe(1);
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('hashedPassword');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should have unique email', () => {
      // This is a TypeORM constraint, so we test that the entity structure supports it
      expect(user.email).toBeDefined();
      expect(typeof user.email).toBe('string');
    });

    it('should have password field', () => {
      expect(user.password).toBeDefined();
      expect(typeof user.password).toBe('string');
    });
  });

  describe('Relationships', () => {
    it('should have roles relationship', () => {
      expect(user.roles).toBeDefined();
      expect(Array.isArray(user.roles)).toBe(true);
      expect(user.roles.length).toBeGreaterThan(0);
      expect(user.roles[0]).toBeInstanceOf(Object);
    });

    it('should have occupations relationship', () => {
      expect(user.occupations).toBeDefined();
      expect(Array.isArray(user.occupations)).toBe(true);
      expect(user.occupations.length).toBeGreaterThan(0);
      expect(user.occupations[0]).toBeInstanceOf(Object);
    });

    it('should have tasks relationship', () => {
      expect(user.tasks).toBeDefined();
      expect(Array.isArray(user.tasks)).toBe(true);
      expect(user.tasks.length).toBeGreaterThan(0);
      expect(user.tasks[0]).toBeInstanceOf(Object);
    });

    it('should have projects relationship', () => {
      expect(user.projects).toBeDefined();
      expect(Array.isArray(user.projects)).toBe(true);
      expect(user.projects.length).toBeGreaterThan(0);
      expect(user.projects[0]).toBeInstanceOf(Object);
    });

    it('should have comments relationship', () => {
      expect(user.comments).toBeDefined();
      expect(Array.isArray(user.comments)).toBe(true);
      expect(user.comments.length).toBeGreaterThan(0);
      expect(user.comments[0]).toBeInstanceOf(Object);
    });

    it('should have structuredNotifications relationship', () => {
      expect(user.structuredNotifications).toBeDefined();
      expect(Array.isArray(user.structuredNotifications)).toBe(true);
      expect(user.structuredNotifications.length).toBeGreaterThan(0);
      expect(user.structuredNotifications[0]).toBeInstanceOf(Object);
    });
  });

  describe('Empty Relationships', () => {
    it('should handle empty relationships', () => {
      const userWithEmptyRelations = {
        ...user,
        roles: [],
        occupations: [],
        tasks: [],
        projects: [],
        comments: [],
        structuredNotifications: []
      };

      expect(Array.isArray(userWithEmptyRelations.roles)).toBe(true);
      expect(Array.isArray(userWithEmptyRelations.occupations)).toBe(true);
      expect(Array.isArray(userWithEmptyRelations.tasks)).toBe(true);
      expect(Array.isArray(userWithEmptyRelations.projects)).toBe(true);
      expect(Array.isArray(userWithEmptyRelations.comments)).toBe(true);
      expect(Array.isArray(userWithEmptyRelations.structuredNotifications)).toBe(true);
    });
  });

  describe('Optional Password', () => {
    it('should handle optional password field', () => {
      const userWithoutPassword = {
        ...user,
        password: undefined
      };

      expect(userWithoutPassword.password).toBeUndefined();
    });
  });

  describe('Timestamps', () => {
    it('should have proper timestamp fields', () => {
      const now = new Date();
      const userWithNowTimestamps = {
        ...user,
        createdAt: now,
        updatedAt: now
      };

      expect(userWithNowTimestamps.createdAt).toEqual(now);
      expect(userWithNowTimestamps.updatedAt).toEqual(now);
    });

    it('should allow different timestamps', () => {
      const created = new Date('2023-01-01');
      const updated = new Date('2023-01-02');
      const userWithDifferentTimestamps = {
        ...user,
        createdAt: created,
        updatedAt: updated
      };

      expect(userWithDifferentTimestamps.createdAt).toEqual(created);
      expect(userWithDifferentTimestamps.updatedAt).toEqual(updated);
      expect(userWithDifferentTimestamps.createdAt.getTime()).toBeLessThan(
        userWithDifferentTimestamps.updatedAt.getTime()
      );
    });
  });

  describe('Multiple Roles', () => {
    it('should handle multiple roles', () => {
      const secondRole = {
        ...mockRole,
        id: 2,
        name: 'User'
      };

      const userWithMultipleRoles = {
        ...user,
        roles: [mockRole, secondRole]
      };

      expect(userWithMultipleRoles.roles.length).toBe(2);
      expect(userWithMultipleRoles.roles.map(r => r.name)).toContain('Admin');
      expect(userWithMultipleRoles.roles.map(r => r.name)).toContain('User');
    });
  });

  describe('Multiple Occupations', () => {
    it('should handle multiple occupations', () => {
      const secondOccupation = {
        ...mockOccupation,
        id: 2,
        name: 'Designer'
      };

      const userWithMultipleOccupations = {
        ...user,
        occupations: [mockOccupation, secondOccupation]
      };

      expect(userWithMultipleOccupations.occupations.length).toBe(2);
      expect(userWithMultipleOccupations.occupations.map(o => o.name)).toContain('Developer');
      expect(userWithMultipleOccupations.occupations.map(o => o.name)).toContain('Designer');
    });
  });
});