import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import { projectFactory, taskFactory } from '../utils/factory.utils';

describe('Comments (e2e)', () => {
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
    const payload = taskFactory({ project_id: projectId });
    const response = await request(e2e.app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...payload,
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    return response.body.data.id;
  }

  describe('POST /api/v1/comments', () => {
    it('should create a new comment', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const payload = {
        content: 'Test comment content',
        task_id: taskId,
      };

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.content).toBe(payload.content);
      expect(response.body.data.task_id).toBe(taskId);
    });

    it('should return 422 without taskId', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: 'No task id' })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(422);
    });
  });

  describe('GET /api/v1/comments', () => {
    it('should list all comments', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const commentPayload = {
        content: 'Comment for listing',
        task_id: taskId,
      };

      await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should list comments by taskId', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);
      const otherProjectId = await createProject();
      const otherTaskId = await createTask(otherProjectId);

      const commentPayload1 = {
        content: 'Task 1 comment',
        task_id: taskId,
      };
      const commentPayload2 = {
        content: 'Task 2 comment',
        task_id: otherTaskId,
      };

      await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload1)
        .expect(201);

      await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload2)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/comments?task=${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].content).toBe(commentPayload1.content);
      expect(response.body.data[0].task_id).toBe(taskId);
    });
  });

  describe('GET /api/v1/comments/:id', () => {
    it('should find one comment', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const commentPayload = {
        content: 'Find me comment',
        task_id: taskId,
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload)
        .expect(201);

      const commentId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(commentId);
      expect(response.body.data.content).toBe(commentPayload.content);
      expect(response.body.data.task_id).toBe(taskId);
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/comments/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain(
        'Comment with ID 99999 not found',
      );
    });
  });

  describe('PUT /api/v1/comments/:id', () => {
    it('should update a comment', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const commentPayload = {
        content: 'Original content',
        task_id: taskId,
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload)
        .expect(201);

      const commentId = createResponse.body.data.id;
      const updatedPayload = {
        content: 'Updated content',
      };

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(commentId);
      expect(response.body.data.content).toBe(updatedPayload.content);
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('should delete a comment', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const commentPayload = {
        content: 'Delete me comment',
        task_id: taskId,
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload)
        .expect(201);

      const commentId = createResponse.body.data.id;

      await request(e2e.app.getHttpServer())
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/comments/:id/like', () => {
    it('should like a comment', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const commentPayload = {
        content: 'Like me comment',
        task_id: taskId,
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload)
        .expect(201);

      const commentId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.data.likesCount).toBe(1);
    });

    it('should be idempotent when liking twice', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const commentPayload = {
        content: 'Like me twice',
        task_id: taskId,
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload)
        .expect(201);

      const commentId = createResponse.body.data.id;

      // Like first time
      await request(e2e.app.getHttpServer())
        .post(`/api/v1/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // Like second time
      const secondResponse = await request(e2e.app.getHttpServer())
        .post(`/api/v1/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(secondResponse.body).toBeDefined();
      expect(secondResponse.body.success).toBe(true);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.data.likesCount).toBe(1);
    });
  });

  describe('DELETE /api/v1/comments/:id/like', () => {
    it('should unlike a comment', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      const commentPayload = {
        content: 'Unlike me comment',
        task_id: taskId,
      };

      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(commentPayload)
        .expect(201);

      const commentId = createResponse.body.data.id;

      await request(e2e.app.getHttpServer())
        .post(`/api/v1/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .delete(`/api/v1/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.data.likesCount).toBe(0);
    });
  });
});
