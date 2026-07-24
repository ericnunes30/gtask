import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import {
  projectFactory,
  taskFactory,
  userFactory,
  occupationFactory,
} from '../utils/factory.utils';
import { PriorityLevel, Status } from '../../src/modules/tasks/entities/enums';

describe('Tasks (e2e)', () => {
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

  async function createUser(
    overrides?: Record<string, unknown>,
  ): Promise<number> {
    const payload = userFactory(overrides);
    const response = await request(e2e.app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);
    return response.body.data.id;
  }

  async function createOccupation(): Promise<number> {
    const payload = occupationFactory();
    const response = await request(e2e.app.getHttpServer())
      .post('/api/v1/occupations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);
    return response.body.data.id;
  }

  describe('POST /api/v1/tasks', () => {
    it('should create a task without relations', async () => {
      const projectId = await createProject();
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

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(payload.title);
      expect(response.body.data.description).toBe(payload.description);
      expect(response.body.data.priority).toBe(payload.priority);
      expect(response.body.data.status).toBe(payload.status);
      expect(response.body.data.project_id).toBe(projectId);
    });

    it('should create a task with relations', async () => {
      const projectId = await createProject();
      const userId = await createUser();
      const occupationId = await createOccupation();

      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
        users: [userId],
        occupations: [occupationId],
      };

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(payload.title);
      expect(response.body.data.project_id).toBe(projectId);
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBe(1);
      expect(response.body.data.users[0].id).toBe(userId);
      expect(Array.isArray(response.body.data.occupations)).toBe(true);
      expect(response.body.data.occupations.length).toBe(1);
      expect(response.body.data.occupations[0].id).toBe(occupationId);
    });

    it('should return 422 for missing required fields', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Missing title' })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(422);
    });

    it('should return 422 for invalid enum values', async () => {
      const projectId = await createProject();
      const payload = {
        title: 'Test task',
        description: 'Test description',
        priority: 'INVALID_PRIORITY',
        status: 'INVALID_STATUS',
        project_id: projectId,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(422);
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for foreign key constraint violation', async () => {
      const payload = {
        ...taskFactory({ project_id: 99999 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 for related users not found', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
        users: [99999],
      };

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should list all tasks', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter tasks by project', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/tasks?project=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].project_id).toBe(projectId);
    });

    it('should filter tasks by status', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId, status: Status.ToDo }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/tasks?status=${Status.ToDo}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].status).toBe(Status.ToDo);
    });

    it('should return 500 for invalid query parameter', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/tasks?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(500);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should find one task', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const taskId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe(payload.title);
      expect(response.body.data.description).toBe(payload.description);
      expect(response.body.data.priority).toBe(payload.priority);
      expect(response.body.data.status).toBe(payload.status);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/tasks/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('Task with ID 99999 not found');
    });

    it('should return 400 for invalid task ID format', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/tasks/abc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('should update a task', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const taskId = createResponse.body.data.id;
      const updatedPayload = {
        title: `Updated ${payload.title}`,
        description: 'Updated description',
        priority: PriorityLevel.High,
        status: Status.InProgress,
        project_id: projectId,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe(updatedPayload.title);
      expect(response.body.data.description).toBe(updatedPayload.description);
      expect(response.body.data.priority).toBe(updatedPayload.priority);
      expect(response.body.data.status).toBe(updatedPayload.status);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should patch a task', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const taskId = createResponse.body.data.id;
      const patchPayload = {
        title: `Patched ${payload.title}`,
      };

      const response = await request(e2e.app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(patchPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe(patchPayload.title);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const taskId = createResponse.body.data.id;

      // Wait for async event listeners to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Clean up related activity logs due to FK constraint
      await e2e.dataSource.query(
        'DELETE FROM activity_logs WHERE task_id = $1',
        [taskId],
      );

      await request(e2e.app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id/timer', () => {
    it('should update task timer', async () => {
      const projectId = await createProject();
      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const taskId = createResponse.body.data.id;
      const timerPayload = { timer: 3600 };

      const response = await request(e2e.app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}/timer`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(timerPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.timer).toBe(timerPayload.timer);
    });

    it('should return 404 for non-existent taskId', async () => {
      const response = await request(e2e.app.getHttpServer())
        .patch('/api/v1/tasks/999999/timer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ timer: 3600 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/tasks/:id/assign-users', () => {
    it('should assign users to a task', async () => {
      const projectId = await createProject();
      const userId = await createUser();

      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const taskId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/assign-users`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userIds: [userId] })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBe(1);
      expect(response.body.data.users[0].id).toBe(userId);
    });

    it('should assign empty array of users to a task', async () => {
      const projectId = await createProject();

      const payload = {
        ...taskFactory({ project_id: projectId }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const taskId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/tasks/${taskId}/assign-users`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userIds: [] })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBe(0);
    });
  });

  describe('GET /api/v1/tasks/:id without token', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/tasks/1')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
    });
  });
});
