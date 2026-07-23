import { randomUUID } from 'crypto';
import { PriorityLevel, Status } from '../../src/modules/tasks/entities/enums';
import { ScheduleType } from '../../src/modules/recurring-task/entities/recurring-task.entity';

export const userFactory = (overrides?: Record<string, unknown>) => ({
  name: `User ${randomUUID()}`,
  email: `user-${randomUUID()}@test.com`,
  password: 'password123',
  is_active: true,
  ...overrides,
});

export const roleFactory = (overrides?: Record<string, unknown>) => ({
  name: `ROLE_${randomUUID().replace(/-/g, '_').toUpperCase()}`,
  description: 'Test role',
  ...overrides,
});

export const occupationFactory = (overrides?: Record<string, unknown>) => ({
  name: `Occupation ${randomUUID()}`,
  ...overrides,
});

export const projectFactory = (overrides?: Record<string, unknown>) => ({
  title: `Project ${randomUUID()}`,
  description: 'Test project description',
  status: true,
  priority: PriorityLevel.Medium,
  start_date: new Date(),
  end_date: new Date(Date.now() + 86400000),
  ...overrides,
});

export const taskFactory = (overrides?: Record<string, unknown>) => ({
  title: `Task ${randomUUID()}`,
  description: 'Test task description',
  priority: PriorityLevel.Medium,
  status: Status.ToDo,
  start_date: new Date(),
  due_date: new Date(Date.now() + 86400000),
  project_id: 1,
  timer: 0,
  has_detailed_fields: false,
  ...overrides,
});

export const commentFactory = (overrides?: Record<string, unknown>) => ({
  content: `Comment ${randomUUID()}`,
  task_id: 1,
  userId: 1,
  parentId: null,
  likesCount: 0,
  ...overrides,
});

export const recurringTaskFactory = (overrides?: Record<string, unknown>) => ({
  name: `Recurring Task ${randomUUID()}`,
  templateData: {
    title: `Recurring ${randomUUID()}`,
    priority: PriorityLevel.Medium,
    assignee_ids: [],
    occupation_ids: [],
  },
  next_due_date: new Date(Date.now() + 86400000),
  is_active: true,
  schedule_type: ScheduleType.INTERVAL,
  frequency_interval: '1d',
  frequency_cron: null,
  userId: 1,
  projectId: 1,
  ...overrides,
});
