import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';

describe('Auth (e2e)', () => {
  let e2e: E2EApp;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    e2e = await bootstrapE2E();
  }, 30000);

  afterAll(async () => {
    if (e2e) {
      await teardownE2E(e2e);
    }
  });

  describe('POST /api/v1/auth/setup', () => {
    it('should create the first admin and return tokens', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/setup')
        .send({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'admin123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@test.com');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and return tokens', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@test.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: '123456' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: '123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens and return NEW access and refresh tokens', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;

      // Verify the new access token works on a protected endpoint
      const profileResponse = await request(e2e.app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.data.email).toBe('admin@test.com');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return profile with valid token', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe('admin@test.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/setup-status', () => {
    it('should return setup status indicating setup is not needed', async () => {
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/auth/setup-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.needsSetup).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 403 when setup is already completed', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'password123',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/auth/verify', () => {
    it('should verify a valid token', async () => {
      const response = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@test.com');
    });
  });

  describe('Token expiration', () => {
    it('should return 401 when using an expired access token on a protected endpoint', async () => {
      // Re-bootstrap to get a fresh app with the 15s token TTL from .env.test
      // Login to obtain a fresh token
      const loginRes = await request(e2e.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123',
        })
        .expect(201);

      const shortLivedToken = loginRes.body.data.accessToken;

      // Wait for token to expire (JWT_ACCESS_EXPIRES_IN=15s)
      await new Promise((resolve) => setTimeout(resolve, 16000));

      // Attempt to access protected endpoint with expired token
      const response = await request(e2e.app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
    }, 30000);
  });
});
