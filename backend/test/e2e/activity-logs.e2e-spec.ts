import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import { projectFactory, taskFactory } from '../utils/factory.utils';
import { PriorityLevel, Status } from '../../src/modules/tasks/entities/enums';

describe('Activity Logs (e2e)', () => {
  let e2e: E2EApp;
  let accessToken: string;

  beforeAll(async () => {
    e2e = await bootstrapE2E();
    const login = await loginAsAdmin(e2e.app, e2e.dataSource);
    accessToken = login.accessToken;
  }, 30000);

  afterAll(async () => {
    if (e2e) {
      await teardownE2E(e2e);
    }
  });

  async function createProject(): Promise<number> {
    const payload = projectFactory();
    const response = await request(e2e.app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...payload,
        start_date: new Date(payload.start_date).toISOString(),
        end_date: new Date(payload.end_date).toISOString(),
      })
      .expect(201);
    return response.body.data.id;
  }

  async function createTask(projectId: number): Promise<number> {
    const payload = {
      ...taskFactory({ project_id: projectId }),
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 86400000).toISOString(),
    };

    const response = await request(e2e.app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    return response.body.data.id;
  }

  describe('GET /api/v1/activity-logs', () => {
    it('should get activity logs without filters', async () => {
      const projectId = await createProject();
      await createTask(projectId);

      // Wait for async activity log generation
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/activity-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);

      const log = response.body.data[0];
      expect(log.id).toBeDefined();
      expect(log.actionType).toBeDefined();
      expect(log.createdAt).toBeDefined();
    });

    it('should filter activity logs by taskId', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      // Wait for async activity log generation
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/activity-logs?taskId=${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.data.every((log: any) => log.taskId === taskId),
      ).toBe(true);
    });

    it('should filter activity logs by actionType', async () => {
      const projectId = await createProject();
      await createTask(projectId);

      // Wait for async activity log generation
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/activity-logs?actionType=CREATE_TASK')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.data.every(
          (log: any) => log.actionType === 'CREATE_TASK',
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/v1/activity-logs/task/:taskId', () => {
    it('should get activity logs by task without page/limit', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      // Wait for async activity log generation
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/activity-logs/task/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].taskId).toBe(taskId);
    });

    it('should get activity logs by task with page and limit', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      // Update the task to generate additional activity logs
      const updatePayload = {
        title: `Updated Task ${Date.now()}`,
        description: 'Updated description',
        priority: PriorityLevel.High,
        status: Status.InProgress,
        project_id: projectId,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(e2e.app.getHttpServer())
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatePayload)
        .expect(200);

      // Wait for async activity log generation
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/activity-logs/task/${taskId}?page=1&limit=1`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);

      // Verify pagination by fetching page 2
      const pageTwoResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/activity-logs/task/${taskId}?page=2&limit=1`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(pageTwoResponse.body).toBeDefined();
      expect(pageTwoResponse.body.success).toBe(true);
      expect(Array.isArray(pageTwoResponse.body.data)).toBe(true);
    });
  });
});
