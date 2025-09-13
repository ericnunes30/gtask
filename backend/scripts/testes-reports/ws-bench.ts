/*
 Simple Socket.IO load generator for NestJS gateway.
 - Auth via handshake.auth.token (uses REST register/login to get JWT)
 - Opens N connections, joins a task room, emits join/leave in a loop
 - Reports connection errors and basic throughput counters
*/
import { io, Socket } from 'socket.io-client';
import { setTimeout as delay } from 'timers/promises';

const API_PREFIX = process.env.API_PREFIX || 'api/v1';
const PORT = process.env.PORT || '3334';
const BASE_HTTP = process.env.BASE_URL || `http://localhost:${PORT}/${API_PREFIX}`;
const BASE_WS = process.env.WS_URL || `http://localhost:${PORT}`; // socket.io default path

type ClientStats = {
  connectedAt?: number;
  connectMs?: number;
  emits: number;
  errors: number;
};

async function loginWith(email: string, password: string): Promise<string | undefined> {
  const base = BASE_HTTP.replace(/\/$/, '');
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data?.accessToken || data?.access_token;
}

async function registerAndLoginFallback(): Promise<string | undefined> {
  const email = `wsbench_${Date.now()}@example.com`;
  const password = 'password123!';
  const base = BASE_HTTP.replace(/\/$/, '');
  try {
    await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'WS Bench', email, password }),
    });
  } catch {}
  try {
    return await loginWith(email, password);
  } catch {
    return undefined;
  }
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const cIdx = process.argv.indexOf('-c');
  const dIdx = process.argv.indexOf('-d');
  const connections = cIdx !== -1 ? Number(process.argv[cIdx + 1]) : 200;
  const duration = dIdx !== -1 ? Number(process.argv[dIdx + 1]) : 30; // seconds
  const emailIdx = process.argv.indexOf('--email');
  const passIdx = process.argv.indexOf('--password');
  const emailArg = emailIdx !== -1 ? process.argv[emailIdx + 1] : process.env.BENCH_EMAIL;
  const passArg = passIdx !== -1 ? process.argv[passIdx + 1] : process.env.BENCH_PASSWORD;

  let token: string | undefined;
  if (emailArg && passArg) {
    token = await loginWith(emailArg, passArg);
    if (!token) {
      try {
        const base = BASE_HTTP.replace(/\/$/, '');
        await fetch(`${base}/auth/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'WS Bench Provided', email: emailArg, password: passArg }),
        });
        token = await loginWith(emailArg, passArg);
      } catch {}
    }
  }
  if (!token) {
    token = await registerAndLoginFallback();
  }
  if (!token) {
    console.warn('Não foi possível obter token JWT; WS auth pode falhar.');
  }

  const stats: ClientStats[] = Array.from({ length: connections }, () => ({ emits: 0, errors: 0 }));
  const clients: Socket[] = new Array(connections);

  console.log(`Conectando ${connections} clientes a ${BASE_WS} ...`);

  // Ramp-up para evitar pico instantâneo
  for (let i = 0; i < connections; i++) {
    const s = stats[i];
    const socket = io(BASE_WS, {
      transports: ['websocket'],
      reconnection: false,
      auth: token ? { token } : undefined,
    });
    clients[i] = socket;
    const started = performance.now();
    socket.on('connect', () => {
      s.connectedAt = Date.now();
      s.connectMs = performance.now() - started;
      // join a random task room (no validation enforced on server)
      const taskId = randInt(1, 50);
      socket.emit('join-task-room', String(taskId));
    });
    socket.on('connect_error', (err) => {
      s.errors++;
      // console.warn('connect_error', err.message);
    });
    socket.on('error', () => {
      s.errors++;
    });
    // small stagger between connections
    if (i % 20 === 0) await delay(50);
  }

  const endAt = Date.now() + duration * 1000;
  let loop = 0;
  while (Date.now() < endAt) {
    // Emit lightweight join/leave to exercise handlers
    for (let i = 0; i < clients.length; i++) {
      const socket = clients[i];
      if (!socket || !socket.connected) continue;
      const s = stats[i];
      const taskId = 1 + ((i + loop) % 50);
      if (loop % 2 === 0) socket.emit('leave-task-room', String(taskId));
      else socket.emit('join-task-room', String(taskId));
      s.emits++;
    }
    loop++;
    await delay(200); // ~5 ops/sec por cliente conectado
  }

  console.log('Encerrando conexões...');
  for (const socket of clients) {
    try {
      socket?.disconnect();
    } catch {}
  }

  // Agregar métricas
  const connected = stats.filter((s) => s.connectedAt);
  const avgConn = connected.reduce((a, b) => a + (b.connectMs || 0), 0) / Math.max(1, connected.length);
  const totalEmits = stats.reduce((a, b) => a + b.emits, 0);
  const totalErrors = stats.reduce((a, b) => a + b.errors, 0);

  console.log('\n=== WS Bench Resultado ===');
  console.log(`Conectados: ${connected.length}/${connections}`);
  console.log(`Tempo médio de conexão: ${avgConn.toFixed(1)} ms`);
  console.log(`Emits totais: ${totalEmits} (~${(totalEmits / duration).toFixed(1)} msg/s)`);
  console.log(`Erros/conn_errors: ${totalErrors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
