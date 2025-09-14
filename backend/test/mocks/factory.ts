import { User } from '../../src/modules/user/entities/user.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { CreateUserDto } from '../../src/modules/user/dto/create-user.dto';
import { LoginDto } from '../../src/modules/auth/dto/login.dto';
import { CreateTaskDto } from '../../src/modules/tasks/dto/create-task.dto';
import { Status, PriorityLevel } from '../../src/modules/tasks/entities/enums'; // Import enums
import { Project } from '../../src/modules/project/entities/project.entity';
import { Occupation } from '../../src/modules/occupation/entities/occupation.entity';
import { Role } from '../../src/modules/role/entities/role.entity';
import { CreateProjectDto } from '../../src/modules/project/dto/create-project.dto';
import { CreateOccupationDto } from '../../src/modules/occupation/dto/create-occupation.dto';
import { CreateRoleDto } from '../../src/modules/role/dto/create-role.dto';
import { RecurringTask, ScheduleType, TaskTemplate } from '../../src/modules/recurring-task/entities/recurring-task.entity';
import { CreateRecurringTaskDto } from '../../src/modules/recurring-task/dto/create-recurring-task.dto';
import { Comment } from '../../src/modules/comment/entities/comment.entity';
import { CreateCommentDto } from '../../src/modules/comment/dto/create-comment.dto';
import { ActivityLog } from '../../src/modules/activity-log/entities/activity-log.entity';

export const mockUserFactory = (data: Partial<User> = {}): User => ({
  id: 1,
  email: 'test@example.com',
  // Use 'password' as default for tests that supply plain-text credentials.
  password: 'password',
  name: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [] as Role[], // Explicitly type as Role[]
  projects: [] as Project[], // Explicitly type as Project[]
  tasks: [] as Task[], // Explicitly type as Task[]
  occupations: [] as Occupation[], // Explicitly type as Occupation[]
  ...data,
});

export const mockCreateUserDtoFactory = (data: Partial<CreateUserDto> = {}): CreateUserDto => ({
  email: 'test@example.com',
  password: 'password',
  name: 'Test User',
  ...data,
});

export const mockLoginDtoFactory = (data: Partial<LoginDto> = {}): LoginDto => ({
  email: 'test@example.com',
  password: 'password',
  ...data,
});

export const mockCreateTaskDtoFactory = (data: Partial<CreateTaskDto> = {}): CreateTaskDto => ({
  title: 'Test Task',
  description: 'This is a test task',
  priority: PriorityLevel.Low, // Corrected to enum value
  status: Status.Backlog, // Corrected to enum value
  start_date: new Date(), // Corrected property name from startDate
  due_date: new Date(), // Corrected property name from dueDate
  project_id: 1, // Assuming project_id is required for task creation
  task_reviewer_id: null, // Assuming reviewer can be null on creation
  // userId: 1, // Removed as it was likely incorrect and not matching entity/dto structure
  // Add other properties if they exist in CreateTaskDto and are needed for mocks
  ...data,
});

export const mockTaskFactory = (data: Partial<Task> = {}): Task => {
  // Define the base Task properties that are required for a mock.
  const baseTaskProperties: Omit<Task, 'toJSON'> = {
    id: 1,
    title: 'Test Task',
    description: 'This is a test task',
    status: Status.Backlog,
    priority: PriorityLevel.Low,
    start_date: new Date(),
    due_date: new Date(),
    order: null,
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
    project: {} as Project, // Mock project
    recurringTask: null, // Mock recurringTask
    reviewer: null as any, // Mock reviewer, casting to User type
    users: [] as User[], // Mock users
    occupations: [] as Occupation[], // Mock occupations
    comments: [] as Comment[], // Mock comments
    activityLogs: [] as ActivityLog[], // Mock activityLogs
  };

  // Merge provided data onto the base properties, handling undefined values
  const mergedTaskData = { ...baseTaskProperties };
  
  // Only merge properties that are not undefined
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      (mergedTaskData as any)[key] = data[key];
    }
  });

  // Define the `toJSON` function with the correct signature.
  const mockToJSON = function(this: Task): Task & { timer: number } {
    const self = this as any; // Cast to `any` to access `timer` and ensure `this` context.
    return {
      ...self,
      timer: self.timer || 0, // Ensure timer is always present and defaults to 0.
    };
  };

  // Create the final mock object, ensuring `toJSON` is correctly assigned.
  const taskMock: Task = {
    ...mergedTaskData,
    toJSON: mockToJSON,
  };

  return taskMock;
};

export const mockProjectFactory = (data: Partial<Project> = {}): Project => ({
  id: 1,
  title: 'Test Project',
  description: 'This is a test project',
  status: true,
  priority: PriorityLevel.Low,
  start_date: new Date(),
  end_date: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  users: [] as User[],
  tasks: [] as Task[],
  occupations: [] as Occupation[],
  ...data,
});

export const mockCreateProjectDtoFactory = (data: Partial<CreateProjectDto> = {}): CreateProjectDto => ({
  title: 'Test Project',
  description: 'This is a test project',
  status: true,
  priority: PriorityLevel.Low,
  start_date: new Date(),
  end_date: new Date(),
  ...data,
});

export const mockOccupationFactory = (data: Partial<Occupation> = {}): Occupation => ({
  id: 1,
  name: 'Test Occupation',
  createdAt: new Date(),
  updatedAt: new Date(),
  users: [] as User[],
  projects: [] as Project[],
  tasks: [] as Task[],
  ...data,
});

export const mockCreateOccupationDtoFactory = (data: Partial<CreateOccupationDto> = {}): CreateOccupationDto => ({
  name: 'Test Occupation',
  ...data,
});

export const mockRoleFactory = (data: Partial<Role> = {}): Role => ({
  id: 1,
  name: 'Test Role',
  description: 'Test Description',
  createdAt: new Date(),
  updatedAt: new Date(),
  users: [] as User[],
  ...data,
});

export const mockCreateRoleDtoFactory = (data: Partial<CreateRoleDto> = {}): CreateRoleDto => ({
  name: 'Test Role',
  description: 'Test Description',
  ...data,
});

export const mockRecurringTaskFactory = (data: Partial<RecurringTask> = {}): RecurringTask => ({
  id: 1,
  name: 'Test Recurring Task',
  templateData: {
    title: 'Generated Task',
    description: 'Auto-generated task from recurring template',
    priority: PriorityLevel.Medium,
    assignee_ids: [1],
    occupation_ids: [1],
    start_date: '+0d',
    due_date: '+7d',
  } as TaskTemplate,
  next_due_date: new Date(),
  is_active: true,
  schedule_type: ScheduleType.INTERVAL,
  frequency_interval: '7d',
  frequency_cron: null,
  userId: 1,
  projectId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: mockUserFactory(),
  project: mockProjectFactory(),
  tasks: [] as Task[],
  ...data,
});

export const mockCreateRecurringTaskDtoFactory = (data: Partial<CreateRecurringTaskDto> = {}): CreateRecurringTaskDto => ({
  name: 'Test Recurring Task',
  schedule_type: ScheduleType.INTERVAL,
  frequency_interval: '7d',
  frequency_cron: null,
  next_due_date: new Date().toISOString(),
  is_active: true,
  userId: 1,
  projectId: 1,
  templateData: {
    title: 'Generated Task',
    description: 'Auto-generated task from recurring template',
    priority: PriorityLevel.Medium,
    assignee_ids: [1],
    occupation_ids: [1],
    start_date: '+0d',
    due_date: '+7d',
  },
  ...data,
});

export const mockCommentFactory = (data: Partial<Comment> = {}): Comment => ({
  id: 1,
  content: 'This is a test comment',
  task_id: 1,
  user_id: 1,
  parentId: null,
  likesCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: mockUserFactory(),
  task: mockTaskFactory(),
  parentComment: null,
  replies: [] as Comment[],
  likes: [],
  mentionedUsers: [] as User[],
  repliesCount: 0,
  ...data,
});

export const mockCreateCommentDtoFactory = (data: Partial<CreateCommentDto> = {}): CreateCommentDto => ({
  content: 'This is a test comment',
  task_id: 1,
  user_id: 1,
  parentId: undefined,
  ...data,
});


// Mock for services and repositories
export const mockUserService = {
  findByEmail: jest.fn().mockResolvedValue(mockUserFactory()),
  create: jest.fn().mockImplementation((dto) => Promise.resolve(mockUserFactory({ ...dto, id: 1 }))),
  // Add common methods used by tests
  findAll: jest.fn().mockResolvedValue([mockUserFactory()]),
  findOne: jest.fn().mockImplementation((arg) => {
    // Accept either a numeric id or an object like { where: { id } }
    if (typeof arg === 'number') {
      return Promise.resolve(mockUserFactory({ id: arg }));
    }
    if (arg && arg.where && typeof arg.where.id !== 'undefined') {
      return Promise.resolve(mockUserFactory({ id: arg.where.id }));
    }
    return Promise.resolve(null);
  }),
  update: jest.fn().mockImplementation((id, dto) => Promise.resolve(mockUserFactory({ ...dto, id }))),
  remove: jest.fn().mockResolvedValue(undefined),
  assignRoles: jest.fn().mockImplementation((id, roleIds) => Promise.resolve(mockUserFactory({ id, roles: roleIds.map(rid => mockRoleFactory({ id: rid })) }))),
  assignOccupations: jest.fn().mockResolvedValue(true),
};

export const mockTaskRepository = {
  create: jest.fn().mockImplementation((dto) => mockTaskFactory(dto)),
  save: jest.fn().mockResolvedValue(mockTaskFactory()),
  findOne: jest.fn().mockImplementation(({ where, relations }) =>
    Promise.resolve(mockTaskFactory({
      id: where.id,
      users: relations?.includes('users') ? [mockUserFactory()] : [],
      project: relations?.includes('project') ? mockProjectFactory() : undefined,
      occupations: relations?.includes('occupations') ? [mockOccupationFactory()] : []
    }))
  ),
  // Tests expect a findAll helper in some places
  findAll: jest.fn().mockResolvedValue([mockTaskFactory()]),
  find: jest.fn().mockResolvedValue([mockTaskFactory()]),
  remove: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(mockTaskFactory()),
};

export const mockProjectRepository = {
  create: jest.fn().mockImplementation((dto) => mockProjectFactory(dto)),
  save: jest.fn().mockResolvedValue(mockProjectFactory()),
  findOne: jest.fn().mockImplementation(({ where, relations }) =>
    Promise.resolve(mockProjectFactory({
      id: where.id,
      tasks: relations?.includes('tasks') ? [mockTaskFactory()] : [],
      users: relations?.includes('users') ? [mockUserFactory()] : [],
      occupations: relations?.includes('occupations') ? [mockOccupationFactory()] : []
    }))
  ),
  find: jest.fn().mockResolvedValue([mockProjectFactory()]),
  findAll: jest.fn().mockResolvedValue([mockProjectFactory()]),
  remove: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(mockProjectFactory()),
};


export const mockAuthService = {
  validateUser: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  verifyToken: jest.fn(),
};

/* Additional repository mocks used by module tests */
export const mockRoleRepository = {
  find: jest.fn().mockResolvedValue([mockRoleFactory()]),
  findOne: jest.fn().mockImplementation(({ where }) => Promise.resolve(mockRoleFactory({ id: where.id }))),
  create: jest.fn().mockImplementation((dto) => mockRoleFactory(dto)),
  save: jest.fn().mockResolvedValue(mockRoleFactory()),
  update: jest.fn().mockResolvedValue(mockRoleFactory()),
  remove: jest.fn().mockResolvedValue(undefined),
};

export const mockOccupationRepository = {
  find: jest.fn().mockResolvedValue([mockOccupationFactory()]),
  findOne: jest.fn().mockImplementation(({ where }) => Promise.resolve(mockOccupationFactory({ id: where.id }))),
  findByIds: jest.fn().mockImplementation((ids) => Promise.resolve(ids.map(id => mockOccupationFactory({ id })))),
  create: jest.fn().mockImplementation((dto) => mockOccupationFactory(dto)),
  save: jest.fn().mockResolvedValue(mockOccupationFactory()),
  update: jest.fn().mockResolvedValue(mockOccupationFactory()),
  remove: jest.fn().mockResolvedValue(undefined),
};

export const mockRecurringTaskRepository = {
  find: jest.fn().mockResolvedValue([mockRecurringTaskFactory()]),
  findOne: jest.fn().mockImplementation(({ where, relations }) =>
    Promise.resolve(mockRecurringTaskFactory({
      id: where.id,
      user: relations?.includes('user') ? mockUserFactory() : undefined,
      project: relations?.includes('project') ? mockProjectFactory() : undefined,
    }))
  ),
  create: jest.fn().mockImplementation((dto) => mockRecurringTaskFactory(dto)),
  save: jest.fn().mockResolvedValue(mockRecurringTaskFactory()),
  update: jest.fn().mockResolvedValue(mockRecurringTaskFactory()),
  remove: jest.fn().mockResolvedValue(undefined),
};