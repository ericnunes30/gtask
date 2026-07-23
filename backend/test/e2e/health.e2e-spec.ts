import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';

describe('Health (e2e)', () => {
  let e2e: E2EApp;

  beforeAll(async () => {
    e2e = await bootstrapE2E();
  }, 30000);

  afterAll(async () => {
    if (e2e) {
      await teardownE2E(e2e);
    }
  });

  it('should expose the application and respond to setup-status', async () => {
    const response = await request(e2e.app.getHttpServer())
      .get('/api/v1/auth/setup-status')
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(typeof response.body.data.needsSetup).toBe('boolean');
  });
});
