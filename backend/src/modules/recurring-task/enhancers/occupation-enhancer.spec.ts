import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OccupationEnhancer } from './occupation-enhancer';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { RecurringTask, ScheduleType } from '../entities/recurring-task.entity';
import { PriorityLevel } from '../../tasks/entities/enums';

const mockOccupationRepository = {
  findByIds: jest.fn().mockResolvedValue([{ id: 1, name: 'Dev' }]),
} as unknown as jest.Mocked<Repository<Occupation>>;

const createMockRecurringTask = (
  overrides?: Partial<RecurringTask>,
): RecurringTask =>
  Object.assign(new RecurringTask(), {
    id: 1,
    name: 'Weekly Report',
    templateData: {
      title: 'Weekly Report',
      priority: PriorityLevel.MEDIUM,
      assignee_ids: [1],
      occupation_ids: [1],
    },
    next_due_date: new Date('2024-01-08'),
    is_active: true,
    schedule_type: ScheduleType.INTERVAL,
    frequency_interval: '1 week',
    frequency_cron: null,
    userId: 1,
    projectId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as RecurringTask['user'],
    project: {} as RecurringTask['project'],
    tasks: [],
    ...overrides,
  });

describe('OccupationEnhancer', () => {
  let enhancer: OccupationEnhancer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccupationEnhancer,
        {
          provide: getRepositoryToken(Occupation),
          useValue: mockOccupationRepository,
        },
      ],
    }).compile();

    enhancer = module.get<OccupationEnhancer>(OccupationEnhancer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enhance', () => {
    it('should populate occupations when occupation_ids are present', async () => {
      const task = createMockRecurringTask();
      const result = await enhancer.enhance(task);

      // eslint-disable-next-line sonarjs/deprecation
      expect(mockOccupationRepository.findByIds).toHaveBeenCalledWith([1]);
      expect(result.templateData.occupations).toEqual([{ id: 1, name: 'Dev' }]);
    });

    it('should return task unchanged when occupation_ids is empty', async () => {
      const task = createMockRecurringTask({
        templateData: {
          title: 'Weekly Report',
          priority: PriorityLevel.MEDIUM,
          assignee_ids: [1],
          occupation_ids: [],
        },
      });
      const result = await enhancer.enhance(task);

      // eslint-disable-next-line sonarjs/deprecation
      expect(mockOccupationRepository.findByIds).not.toHaveBeenCalled();
      expect(result.templateData.occupations).toBeUndefined();
    });

    it('should return task unchanged when occupation_ids is undefined', async () => {
      const task = createMockRecurringTask({
        templateData: {
          title: 'Weekly Report',
          priority: PriorityLevel.MEDIUM,
          assignee_ids: [1],
          occupation_ids: undefined,
        },
      });
      const result = await enhancer.enhance(task);

      // eslint-disable-next-line sonarjs/deprecation
      expect(mockOccupationRepository.findByIds).not.toHaveBeenCalled();
      expect(result.templateData.occupations).toBeUndefined();
    });
  });

  describe('enhanceMany', () => {
    it('should call enhance for each task', async () => {
      const tasks = [
        createMockRecurringTask(),
        createMockRecurringTask({
          id: 2,
          templateData: {
            title: 'Daily Report',
            priority: PriorityLevel.HIGH,
            assignee_ids: [2],
            occupation_ids: [2],
          },
        }),
      ];

      const results = await enhancer.enhanceMany(tasks);

      // eslint-disable-next-line sonarjs/deprecation
      expect(mockOccupationRepository.findByIds).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0].templateData.occupations).toEqual([
        { id: 1, name: 'Dev' },
      ]);
      expect(results[1].templateData.occupations).toEqual([
        { id: 1, name: 'Dev' },
      ]);
    });
  });
});
