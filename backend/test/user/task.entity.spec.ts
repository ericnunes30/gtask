import { Task, PriorityLevel, Status } from '../../src/modules/user/entities/task.entity';

describe('Task Entity', () => {
  let task: Task;

  beforeEach(() => {
    task = {
      id: 1,
      order: 1,
      title: 'Test Task',
      description: 'This is a test task description',
      priority: PriorityLevel.Medium,
      status: Status.Backlog,
      start_date: new Date('2023-01-01'),
      due_date: new Date('2023-01-08'),
      timer: 0,
      project_id: 1,
      recurring_task_id: null,
      task_reviewer_id: null,
      video_url: null,
      useful_links: null,
      observations: null,
      has_detailed_fields: false,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    } as Task;
  });

  describe('Basic Properties', () => {
    it('should have required properties', () => {
      expect(task.id).toBe(1);
      expect(task.title).toBe('Test Task');
      expect(task.priority).toBe(PriorityLevel.Medium);
      expect(task.status).toBe(Status.Backlog);
      expect(task.start_date).toBeInstanceOf(Date);
      expect(task.due_date).toBeInstanceOf(Date);
      expect(task.timer).toBe(0);
      expect(task.project_id).toBe(1);
      expect(task.has_detailed_fields).toBe(false);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should have optional properties', () => {
      expect(task.description).toBe('This is a test task description');
      expect(task.order).toBe(1);
      expect(task.recurring_task_id).toBeNull();
      expect(task.task_reviewer_id).toBeNull();
      expect(task.video_url).toBeNull();
      expect(task.useful_links).toBeNull();
      expect(task.observations).toBeNull();
    });
  });

  describe('Enum Values', () => {
    it('should accept all valid priority levels', () => {
      const priorities = [
        PriorityLevel.Low,
        PriorityLevel.Medium,
        PriorityLevel.High,
        PriorityLevel.Urgent
      ];

      priorities.forEach(priority => {
        const taskWithPriority = { ...task, priority };
        expect(taskWithPriority.priority).toBe(priority);
      });
    });

    it('should accept all valid status values', () => {
      const statuses = [
        Status.Backlog,
        Status.ToDo,
        Status.InProgress,
        Status.Review,
        Status.WaitingClient,
        Status.Done,
        Status.Cancelled
      ];

      statuses.forEach(status => {
        const taskWithStatus = { ...task, status };
        expect(taskWithStatus.status).toBe(status);
      });
    });

    it('should have correct enum string values', () => {
      expect(PriorityLevel.Low).toBe('baixa');
      expect(PriorityLevel.Medium).toBe('media');
      expect(PriorityLevel.High).toBe('alta');
      expect(PriorityLevel.Urgent).toBe('urgente');

      expect(Status.Backlog).toBe('pendente');
      expect(Status.ToDo).toBe('a_fazer');
      expect(Status.InProgress).toBe('em_andamento');
      expect(Status.Review).toBe('em_revisao');
      expect(Status.WaitingClient).toBe('aguardando_cliente');
      expect(Status.Done).toBe('concluido');
      expect(Status.Cancelled).toBe('cancelado');
    });
  });

  describe('Dates', () => {
    it('should handle valid date ranges', () => {
      const startDate = new Date('2023-01-01');
      const dueDate = new Date('2023-01-08');
      const taskWithDates = { ...task, start_date: startDate, due_date: dueDate };

      expect(taskWithDates.start_date).toEqual(startDate);
      expect(taskWithDates.due_date).toEqual(dueDate);
      expect(taskWithDates.start_date.getTime()).toBeLessThan(taskWithDates.due_date.getTime());
    });

    it('should handle same start and due dates', () => {
      const sameDate = new Date('2023-01-01');
      const taskWithSameDates = { ...task, start_date: sameDate, due_date: sameDate };

      expect(taskWithSameDates.start_date).toEqual(sameDate);
      expect(taskWithSameDates.due_date).toEqual(sameDate);
    });

    it('should handle timestamp fields', () => {
      const now = new Date();
      const taskWithNowTimestamps = { ...task, createdAt: now, updatedAt: now };

      expect(taskWithNowTimestamps.createdAt).toEqual(now);
      expect(taskWithNowTimestamps.updatedAt).toEqual(now);
    });
  });

  describe('Optional Fields', () => {
    it('should handle null description', () => {
      const taskWithoutDescription = { ...task, description: null };
      expect(taskWithoutDescription.description).toBeNull();
    });

    it('should handle empty description', () => {
      const taskWithEmptyDescription = { ...task, description: '' };
      expect(taskWithEmptyDescription.description).toBe('');
    });

    it('should handle null order', () => {
      const taskWithoutOrder = { ...task, order: null };
      expect(taskWithoutOrder.order).toBeNull();
    });

    it('should handle numeric order', () => {
      const taskWithOrder = { ...task, order: 5 };
      expect(taskWithOrder.order).toBe(5);
    });

    it('should handle null video URL', () => {
      const taskWithoutVideo = { ...task, video_url: null };
      expect(taskWithoutVideo.video_url).toBeNull();
    });

    it('should handle valid video URL', () => {
      const taskWithVideo = { ...task, video_url: 'https://example.com/video.mp4' };
      expect(taskWithVideo.video_url).toBe('https://example.com/video.mp4');
    });

    it('should handle null useful links', () => {
      const taskWithoutLinks = { ...task, useful_links: null };
      expect(taskWithoutLinks.useful_links).toBeNull();
    });

    it('should handle empty useful links array', () => {
      const taskWithEmptyLinks = { ...task, useful_links: [] };
      expect(taskWithEmptyLinks.useful_links).toEqual([]);
    });

    it('should handle useful links with data', () => {
      const links = [
        { title: 'Documentation', url: 'https://docs.example.com' },
        { title: 'Design', url: 'https://design.example.com' }
      ];
      const taskWithLinks = { ...task, useful_links: links };
      expect(taskWithLinks.useful_links).toEqual(links);
    });

    it('should handle null observations', () => {
      const taskWithoutObservations = { ...task, observations: null };
      expect(taskWithoutObservations.observations).toBeNull();
    });

    it('should handle empty observations', () => {
      const taskWithEmptyObservations = { ...task, observations: '' };
      expect(taskWithEmptyObservations.observations).toBe('');
    });

    it('should handle observations with text', () => {
      const observations = 'Important notes about this task';
      const taskWithObservations = { ...task, observations };
      expect(taskWithObservations.observations).toBe(observations);
    });
  });

  describe('Timer Field', () => {
    it('should handle zero timer', () => {
      const taskWithZeroTimer = { ...task, timer: 0 };
      expect(taskWithZeroTimer.timer).toBe(0);
    });

    it('should handle positive timer values', () => {
      const timerValues = [1, 60, 3600, 86400]; // 1 second, 1 minute, 1 hour, 1 day
      timerValues.forEach(timer => {
        const taskWithTimer = { ...task, timer };
        expect(taskWithTimer.timer).toBe(timer);
      });
    });
  });

  describe('Has Detailed Fields', () => {
    it('should handle false value', () => {
      const taskWithoutDetailedFields = { ...task, has_detailed_fields: false };
      expect(taskWithoutDetailedFields.has_detailed_fields).toBe(false);
    });

    it('should handle true value', () => {
      const taskWithDetailedFields = { ...task, has_detailed_fields: true };
      expect(taskWithDetailedFields.has_detailed_fields).toBe(true);
    });
  });

  describe('ID Fields', () => {
    it('should handle positive project ID', () => {
      const taskWithProjectId = { ...task, project_id: 5 };
      expect(taskWithProjectId.project_id).toBe(5);
    });

    it('should handle null recurring task ID', () => {
      const taskWithoutRecurringId = { ...task, recurring_task_id: null };
      expect(taskWithoutRecurringId.recurring_task_id).toBeNull();
    });

    it('should handle valid recurring task ID', () => {
      const taskWithRecurringId = { ...task, recurring_task_id: 10 };
      expect(taskWithRecurringId.recurring_task_id).toBe(10);
    });

    it('should handle null task reviewer ID', () => {
      const taskWithoutReviewerId = { ...task, task_reviewer_id: null };
      expect(taskWithoutReviewerId.task_reviewer_id).toBeNull();
    });

    it('should handle valid task reviewer ID', () => {
      const taskWithReviewerId = { ...task, task_reviewer_id: 15 };
      expect(taskWithReviewerId.task_reviewer_id).toBe(15);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large timer values', () => {
      const largeTimer = 999999999;
      const taskWithLargeTimer = { ...task, timer: largeTimer };
      expect(taskWithLargeTimer.timer).toBe(largeTimer);
    });

    it('should handle very long titles', () => {
      const longTitle = 'a'.repeat(1000);
      const taskWithLongTitle = { ...task, title: longTitle };
      expect(taskWithLongTitle.title).toBe(longTitle);
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'a'.repeat(5000);
      const taskWithLongDescription = { ...task, description: longDescription };
      expect(taskWithLongDescription.description).toBe(longDescription);
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Task with special chars: áéíóú ñ ü @#$%^&*()';
      const taskWithSpecialTitle = { ...task, title: specialTitle };
      expect(taskWithSpecialTitle.title).toBe(specialTitle);
    });

    it('should handle URLs with special characters', () => {
      const specialUrl = 'https://example.com/path?param=value&another=test#anchor';
      const taskWithSpecialUrl = { ...task, video_url: specialUrl };
      expect(taskWithSpecialUrl.video_url).toBe(specialUrl);
    });

    it('should handle useful links with special URLs', () => {
      const links = [
        { title: 'API Docs', url: 'https://api.example.com/v2/endpoint?param=value' },
        { title: 'Local Resource', url: 'http://localhost:3000/resource' }
      ];
      const taskWithSpecialLinks = { ...task, useful_links: links };
      expect(taskWithSpecialLinks.useful_links).toEqual(links);
    });
  });

  describe('Future and Past Dates', () => {
    it('should handle future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const taskWithFutureDates = { ...task, start_date: futureDate, due_date: futureDate };
      
      expect(taskWithFutureDates.start_date.getTime()).toBeGreaterThan(Date.now());
      expect(taskWithFutureDates.due_date.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle past dates', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const taskWithPastDates = { ...task, start_date: pastDate, due_date: pastDate };
      
      expect(taskWithPastDates.start_date.getTime()).toBeLessThan(Date.now());
      expect(taskWithPastDates.due_date.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('Complete Task Object', () => {
    it('should create a complete task with all fields', () => {
      const completeTask: Task = {
        id: 100,
        order: 10,
        title: 'Complete Task Example',
        description: 'This is a complete task with all fields populated',
        priority: PriorityLevel.High,
        status: Status.InProgress,
        start_date: new Date('2023-06-01'),
        due_date: new Date('2023-06-15'),
        timer: 7200,
        project_id: 25,
        recurring_task_id: 5,
        task_reviewer_id: 3,
        video_url: 'https://example.com/tutorial.mp4',
        useful_links: [
          { title: 'Requirements', url: 'https://docs.example.com/requirements' },
          { title: 'Design Mockups', url: 'https://design.example.com/mockups' }
        ],
        observations: 'Remember to check the requirements before starting',
        has_detailed_fields: true,
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date('2023-06-10')
      };

      expect(completeTask.id).toBe(100);
      expect(completeTask.title).toBe('Complete Task Example');
      expect(completeTask.priority).toBe(PriorityLevel.High);
      expect(completeTask.status).toBe(Status.InProgress);
      expect(completeTask.useful_links).toHaveLength(2);
      expect(completeTask.has_detailed_fields).toBe(true);
    });
  });
});