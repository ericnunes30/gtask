import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import { projectFactory } from '../utils/factory.utils';
import { PriorityLevel, Status } from '../../src/modules/tasks/entities/enums';

describe('Projects (e2e)', () => {
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

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const payload = projectFactory();

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(payload.title);
      expect(response.body.data.description).toBe(payload.description);
      expect(response.body.data.status).toBe(payload.status);
      expect(response.body.data.priority).toBe(payload.priority);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should list all projects', async () => {
      const payload = projectFactory();
      await request(e2e.app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should find one project', async () => {
      const payload = projectFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const projectId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data.title).toBe(payload.title);
      expect(response.body.data.description).toBe(payload.description);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/projects/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain(
        'Project with ID 99999 not found',
      );
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update a project', async () => {
      const payload = projectFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const projectId = createResponse.body.data.id;
      const updatedPayload = {
        title: `Updated ${payload.title}`,
        description: 'Updated description',
        status: false,
        priority: PriorityLevel.High,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data.title).toBe(updatedPayload.title);
      expect(response.body.data.description).toBe(updatedPayload.description);
      expect(response.body.data.status).toBe(updatedPayload.status);
      expect(response.body.data.priority).toBe(updatedPayload.priority);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete a project', async () => {
      const payload = projectFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const projectId = createResponse.body.data.id;

      await request(e2e.app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/projects/:id/tasks', () => {
    it('should return empty tasks initially, then with tasks', async () => {
      const payload = projectFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const projectId = createResponse.body.data.id;

      // Initially empty
      const emptyResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(emptyResponse.body).toBeDefined();
      expect(emptyResponse.body.success).toBe(true);
      expect(Array.isArray(emptyResponse.body.data)).toBe(true);
      expect(emptyResponse.body.data.length).toBe(0);

      // Create a task for the project
      const taskPayload = {
        title: 'Test Task',
        description: 'Test task description',
        priority: PriorityLevel.Medium,
        status: Status.ToDo,
        project_id: projectId,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(taskPayload)
        .expect(201);

      // Now should have tasks
      const tasksResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(tasksResponse.body).toBeDefined();
      expect(tasksResponse.body.success).toBe(true);
      expect(Array.isArray(tasksResponse.body.data)).toBe(true);
      expect(tasksResponse.body.data.length).toBe(1);
      expect(tasksResponse.body.data[0].title).toBe(taskPayload.title);
      expect(tasksResponse.body.data[0].project_id).toBe(projectId);
    });
  });
});
