import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import { projectFactory, occupationFactory } from '../utils/factory.utils';
import { ScheduleType } from '../../src/modules/recurring-task/entities/recurring-task.entity';
import { PriorityLevel } from '../../src/modules/tasks/entities/enums';

describe('RecurringTasks (e2e)', () => {
  let e2e: E2EApp;
  let accessToken: string;
  let projectId: number;
  let occupationId: number;
  let userId: number;

  beforeAll(async () => {
    e2e = await bootstrapE2E();
    const login = await loginAsAdmin(e2e.app, e2e.dataSource);
    accessToken = login.accessToken;

    // Create occupation (required for recurring task templateData)
    const occupationPayload = occupationFactory();
    const occupationResponse = await request(e2e.app.getHttpServer())
      .post('/api/v1/occupations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(occupationPayload)
      .expect(201);
    occupationId = occupationResponse.body.data.id;

    // Create project (required for recurring task)
    const projectPayload = projectFactory();
    const projectResponse = await request(e2e.app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(projectPayload)
      .expect(201);
    projectId = projectResponse.body.data.id;

    // Get current user id from JWT profile
    const profileResponse = await request(e2e.app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    userId = profileResponse.body.data.sub;
  }, 30000);

  afterAll(async () => {
    if (e2e) {
      await teardownE2E(e2e);
    }
  });

  const createRecurringTaskPayload = () => ({
    name: `Recurring Task ${Date.now()}`,
    schedule_type: ScheduleType.INTERVAL,
    frequency_interval: '1d',
    next_due_date: new Date(Date.now() + 86400000).toISOString(),
    is_active: true,
    projectId,
    templateData: {
      title: `Recurring ${Date.now()}`,
      priority: PriorityLevel.Medium,
      assignee_ids: [userId],
      occupation_ids: [occupationId],
    },
  });

  describe('POST /api/v1/recurring-tasks', () => {
    it('should create a new recurring task with current user', async () => {
      const payload = createRecurringTaskPayload();

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/recurring-tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.schedule_type).toBe(payload.schedule_type);
      expect(response.body.data.projectId).toBe(payload.projectId);
      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.templateData).toBeDefined();
      expect(response.body.data.templateData.title).toBe(
        payload.templateData.title,
      );
    });
  });

  describe('GET /api/v1/recurring-tasks', () => {
    it('should list all recurring tasks', async () => {
      const payload = createRecurringTaskPayload();
      await request(e2e.app.getHttpServer())
        .post('/api/v1/recurring-tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/recurring-tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/recurring-tasks/:id', () => {
    it('should find one recurring task', async () => {
      const payload = createRecurringTaskPayload();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/recurring-tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const recurringTaskId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/recurring-tasks/${recurringTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(recurringTaskId);
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.projectId).toBe(payload.projectId);
    });

    it('should return 404 for non-existent recurring task', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/recurring-tasks/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain(
        'RecurringTask with ID 99999 not found',
      );
    });
  });

  describe('PUT /api/v1/recurring-tasks/:id', () => {
    it('should update a recurring task', async () => {
      const payload = createRecurringTaskPayload();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/recurring-tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const recurringTaskId = createResponse.body.data.id;
      const updatedPayload = {
        name: `Updated ${payload.name}`,
        schedule_type: ScheduleType.CRON,
        frequency_cron: '0 0 * * *',
        is_active: false,
      };

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/recurring-tasks/${recurringTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(recurringTaskId);
      expect(response.body.data.name).toBe(updatedPayload.name);
      expect(response.body.data.schedule_type).toBe(updatedPayload.schedule_type);
      expect(response.body.data.frequency_cron).toBe(updatedPayload.frequency_cron);
      expect(response.body.data.is_active).toBe(updatedPayload.is_active);
    });
  });

  describe('DELETE /api/v1/recurring-tasks/:id', () => {
    it('should delete a recurring task', async () => {
      const payload = createRecurringTaskPayload();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/recurring-tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const recurringTaskId = createResponse.body.data.id;

      await request(e2e.app.getHttpServer())
        .delete(`/api/v1/recurring-tasks/${recurringTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/recurring-tasks/${recurringTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.statusCode).toBe(404);
    });
  });
});
