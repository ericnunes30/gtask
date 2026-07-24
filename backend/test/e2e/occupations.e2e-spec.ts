import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import { occupationFactory } from '../utils/factory.utils';

describe('Occupations (e2e)', () => {
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

  describe('POST /api/v1/occupations', () => {
    it('should create a new occupation', async () => {
      const payload = occupationFactory();

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /api/v1/occupations', () => {
    it('should list all occupations', async () => {
      const payload = occupationFactory();
      await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/occupations/:id', () => {
    it('should find one occupation', async () => {
      const payload = occupationFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const occupationId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/occupations/${occupationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(occupationId);
      expect(response.body.data.name).toBe(payload.name);
    });

    it('should return 404 for non-existent occupation', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/occupations/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain(
        'Occupation with ID 99999 not found',
      );
    });
  });

  describe('PUT /api/v1/occupations/:id', () => {
    it('should update an occupation', async () => {
      const payload = occupationFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const occupationId = createResponse.body.data.id;
      const updatedPayload = { name: `Updated ${payload.name}` };

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/occupations/${occupationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(occupationId);
      expect(response.body.data.name).toBe(updatedPayload.name);
    });

    it('should return 409 when updating to existing name', async () => {
      const payload1 = occupationFactory();
      const payload2 = occupationFactory();

      const createResponse1 = await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload1)
        .expect(201);

      await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload2)
        .expect(201);

      const occupationId = createResponse1.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/occupations/${occupationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: payload2.name })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/v1/occupations/:id', () => {
    it('should delete an occupation', async () => {
      const payload = occupationFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const occupationId = createResponse.body.data.id;

      await request(e2e.app.getHttpServer())
        .delete(`/api/v1/occupations/${occupationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/occupations/${occupationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/occupations/:id/users', () => {
    it('should return 404 for invalid userId', async () => {
      const payload = occupationFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const occupationId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/occupations/${occupationId}/users`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: 99999 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
    });
  });
});
