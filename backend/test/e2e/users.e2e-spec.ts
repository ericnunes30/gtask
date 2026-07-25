import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import {
  userFactory,
  roleFactory,
  occupationFactory,
} from '../utils/factory.utils';

describe('Users (e2e)', () => {
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

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const payload = userFactory();

      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.email).toBe(payload.email);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 422 for invalid email format', async () => {
      const payload = { name: 'Test', email: 'invalid-email', password: '123' };
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(422);
    });

    it('should return 409 for duplicate email', async () => {
      const payload = {
        name: 'Duplicate',
        email: 'admin@test.com',
        password: 'password123',
      };
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(409);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should list all users', async () => {
      const payload = userFactory();
      await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should find one user', async () => {
      const payload = userFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const userId = createResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.email).toBe(payload.email);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/users/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('User with ID 99999 not found');
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/users/abc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update a user', async () => {
      const payload = userFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const userId = createResponse.body.data.id;
      const updatedPayload = { name: `Updated ${payload.name}` };

      const response = await request(e2e.app.getHttpServer())
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updatedPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.name).toBe(updatedPayload.name);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete a user', async () => {
      const payload = userFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const userId = createResponse.body.data.id;

      await request(e2e.app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(e2e.app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/users/search/:email', () => {
    it('should find user by email', async () => {
      const payload = userFactory();
      const createResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)
        .expect(201);

      const email = createResponse.body.data.email;

      const response = await request(e2e.app.getHttpServer())
        .get(`/api/v1/users/search/${encodeURIComponent(email)}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(email);
    });
  });

  describe('POST /api/v1/users/:id/assign-roles', () => {
    it('should assign roles to a user', async () => {
      const userPayload = userFactory();
      const userResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userPayload)
        .expect(201);

      const userId = userResponse.body.data.id;

      const rolePayload = roleFactory();
      const roleResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(rolePayload)
        .expect(201);

      const roleId = roleResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/users/${userId}/assign-roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ roleIds: [roleId] })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.roles).toBeDefined();
      expect(Array.isArray(response.body.data.roles)).toBe(true);
      expect(response.body.data.roles.length).toBe(1);
      expect(response.body.data.roles[0].id).toBe(roleId);
    });

    it('should assign empty roles array to a user', async () => {
      const userPayload = userFactory();
      const userResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userPayload)
        .expect(201);

      const userId = userResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/users/${userId}/assign-roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ roleIds: [] })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.roles).toBeDefined();
      expect(Array.isArray(response.body.data.roles)).toBe(true);
      expect(response.body.data.roles.length).toBe(0);
    });
  });

  describe('POST /api/v1/users/:id/assign-occupations', () => {
    it('should assign occupations to a user', async () => {
      const userPayload = userFactory();
      const userResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userPayload)
        .expect(201);

      const userId = userResponse.body.data.id;

      const occupationPayload = occupationFactory();
      const occupationResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/occupations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(occupationPayload)
        .expect(201);

      const occupationId = occupationResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/users/${userId}/assign-occupations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ occupationIds: [occupationId] })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.occupations).toBeDefined();
      expect(Array.isArray(response.body.data.occupations)).toBe(true);
      expect(response.body.data.occupations.length).toBe(1);
      expect(response.body.data.occupations[0].id).toBe(occupationId);
    });

    it('should assign empty occupations array to a user', async () => {
      const userPayload = userFactory();
      const userResponse = await request(e2e.app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userPayload)
        .expect(201);

      const userId = userResponse.body.data.id;

      const response = await request(e2e.app.getHttpServer())
        .post(`/api/v1/users/${userId}/assign-occupations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ occupationIds: [] })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.occupations).toBeDefined();
      expect(Array.isArray(response.body.data.occupations)).toBe(true);
      expect(response.body.data.occupations.length).toBe(0);
    });
  });

  describe('GET /api/v1/users/:id without token', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/users/1')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
    });
  });
});
