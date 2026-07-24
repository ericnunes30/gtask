import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import { roleFactory } from '../utils/factory.utils';

describe('Roles (e2e)', () => {
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

  describe('POST /api/v1/roles', () => {
    it('should create a new role', async () => {
      const payload = roleFactory();

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.description).toBe(payload.description);
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /api/v1/roles', () => {
    it('should list all roles', async () => {
      const payload = roleFactory();
      await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/roles/:id', () => {
    it('should find one role', async () => {
      const payload = roleFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const roleId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(roleId);
      expect(response.body.data.name).toBe(payload.name);
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/roles/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('Role with ID 99999 not found');
    });
  });

  describe('PUT /api/v1/roles/:id', () => {
    it('should update a role', async () => {
      const payload = roleFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const roleId = createResponse.body.data.id;
      const updatedPayload = roleFactory({
        description: 'Updated description',
      });

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(roleId);
      expect(response.body.data.name).toBe(updatedPayload.name);
      expect(response.body.data.description).toBe(updatedPayload.description);
    });

    it('should return 409 when updating to existing name', async () => {
      const payload1 = roleFactory();
      const payload2 = roleFactory();

      const createResponse1 = await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload1)
        .expect(201);

      await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload2)
        .expect(201);

      const roleId = createResponse1.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: payload2.name })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/v1/roles/:id', () => {
    it('should delete a role', async () => {
      const payload = roleFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const roleId = createResponse.body.data.id;

      await request(e2e.app.getHttpServer())
        .delete(`/api/v1/roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.statusCode).toBe(404);
    });
  });
});
