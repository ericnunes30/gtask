import { io, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { bootstrapE2E, E2EApp } from '../setup-e2e';
import { teardownE2E } from '../teardown-e2e';
import { loginAsAdmin } from '../utils/auth.utils';
import { projectFactory, taskFactory } from '../utils/factory.utils';

const WS_URL = 'http://localhost:3335';

describe('WebSocket Events (e2e)', () => {
  let e2e: E2EApp;
  let accessToken: string;
  let socket: ClientSocket | undefined;

  beforeAll(async () => {
    e2e = await bootstrapE2E();
    await e2e.app.listen(3335);
    const login = await loginAsAdmin(e2e.app, e2e.dataSource);
    accessToken = login.accessToken;
  }, 30000);

  afterEach(() => {
    if (socket) {
      socket.disconnect();
      socket = undefined;
    }
  });

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

  describe('Connect with valid token', () => {
    it('should connect successfully', async () => {
      socket = io(WS_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Connection timeout')),
          5000,
        );
        socket!.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket!.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      expect(socket.connected).toBe(true);
    });
  });

  describe('Connect without token', () => {
    it('should reject connection', async () => {
      socket = io(WS_URL, {
        transports: ['websocket'],
      });

      let connectErrorReceived = false;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 5000);
        socket!.on('connect_error', () => {
          connectErrorReceived = true;
          clearTimeout(timeout);
          resolve();
        });
      });

      expect(connectErrorReceived).toBe(true);
      expect(socket.connected).toBe(false);
    });
  });

  describe('Timer start event', () => {
    it('should receive timer.started when timer starts', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      socket = io(WS_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Connection timeout')),
          5000,
        );
        socket!.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket!.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      socket.emit('join-task-room', taskId.toString());

      const timerStartedPromise = new Promise<{ taskId: number }>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('timer.started timeout')),
            5000,
          );
          socket!.once('timer.started', (payload: { taskId: number }) => {
            clearTimeout(timeout);
            resolve(payload);
          });
        },
      );

      socket.emit('timer.start', { taskId });

      const payload = await timerStartedPromise;
      expect(payload.taskId).toBe(taskId);

      // Cleanup: pause timer to stop the interval
      socket.emit('timer.pause', { taskId });
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
  });

  describe('Timer pause event', () => {
    it('should receive timer.paused when timer pauses', async () => {
      const projectId = await createProject();
      const taskId = await createTask(projectId);

      socket = io(WS_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Connection timeout')),
          5000,
        );
        socket!.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket!.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      socket.emit('join-task-room', taskId.toString());

      // Start timer first
      const timerStartedPromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 5000);
        socket!.once('timer.started', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      socket.emit('timer.start', { taskId });
      await timerStartedPromise;

      const timerPausedPromise = new Promise<{ taskId: number }>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('timer.paused timeout')),
            5000,
          );
          socket!.once('timer.paused', (payload: { taskId: number }) => {
            clearTimeout(timeout);
            resolve(payload);
          });
        },
      );

      socket.emit('timer.pause', { taskId });

      const payload = await timerPausedPromise;
      expect(payload.taskId).toBe(taskId);
    });
  });

  describe('WebSocket edge cases', () => {
    let socket: ClientSocket;

    afterEach(() => {
      if (socket?.connected) socket.disconnect();
    });

    it('should reject connection with invalid token', async () => {
      return new Promise<void>((resolve, reject) => {
        socket = io(WS_URL, {
          auth: { token: 'invalid-token-12345' },
          transports: ['websocket'],
          reconnection: false,
        });

        socket.on('connect_error', (err) => {
          expect(err.message).toContain('Authentication error');
          resolve();
        });

        socket.on('connect', () => {
          reject(new Error('Should not connect with invalid token'));
        });

        // Timeout fallback
        setTimeout(
          () => reject(new Error('Timeout waiting for connect_error')),
          5000,
        );
      });
    }, 10000);

  });
});
