/*
 Runs autocannon across discovered routes. Defaults to GET-only.
 It will try to register+login to obtain a JWT and include it.
*/
import autocannon from 'autocannon';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

type Route = { method: string; path: string };

const API_PREFIX = process.env.API_PREFIX || 'api/v1';
const PORT = process.env.PORT || '3334';
const BASE = process.env.BASE_URL || `http://localhost:${PORT}/${API_PREFIX}`;

function ensureRoutes(): Route[] {
  const routesPath = join(__dirname, '..', '.bench', 'routes.json');
  if (!existsSync(routesPath)) {
    const r = spawnSync('node', ['-e', 'process.exit(0)']);
    // Generate by running discover script with ts-node
    const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['ts-node', 'scripts/discover-routes.ts'], {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
    });
    if (res.status !== 0) throw new Error('Failed to generate routes');
  }
  const raw = readFileSync(routesPath, 'utf8');
  return JSON.parse(raw);
}

async function loginWith(email: string, password: string): Promise<string | undefined> {
  const base = BASE.replace(/\/$/, '');
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
  const email = `bench_${Date.now()}@example.com`;
  const password = 'password123!';
  const base = BASE.replace(/\/$/, '');
  try {
    await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bench User', email, password }),
    });
  } catch {}
  try {
    return await loginWith(email, password);
  } catch {
    return undefined;
  }
}

function replaceParams(path: string): string {
  // Substitute ":param" with sample values
  return path.replace(/:([a-zA-Z0-9_]+)/g, (_m, name) => {
    if (/email/i.test(name)) return 'user@example.com';
    return '1';
  });
}

async function run() {
  // Flags/opções extras
  const onlyMethodsArgIdx = process.argv.indexOf('--methods');
  const onlyMethods = onlyMethodsArgIdx !== -1 ? (process.argv[onlyMethodsArgIdx + 1] || 'GET').split(',').map((s) => s.trim().toUpperCase()) : ['GET'];
  const cIdx = process.argv.indexOf('-c');
  const dIdx = process.argv.indexOf('-d');
  const pIdx = process.argv.indexOf('-p');
  const connections = cIdx !== -1 ? Number(process.argv[cIdx + 1]) : 50;
  const duration = dIdx !== -1 ? Number(process.argv[dIdx + 1]) : 20;
  const pipelining = pIdx !== -1 ? Number(process.argv[pIdx + 1]) : 10;
  const emailIdx = process.argv.indexOf('--email');
  const passIdx = process.argv.indexOf('--password');
  const emailArg = emailIdx !== -1 ? process.argv[emailIdx + 1] : process.env.BENCH_EMAIL;
  const passArg = passIdx !== -1 ? process.argv[passIdx + 1] : process.env.BENCH_PASSWORD;
  const benchLogin = process.argv.includes('--bench-login');
  const useSaved = process.argv.includes('--use-saved-token');
  const skipAuth = process.argv.includes('--skip-auth');

  const routes = ensureRoutes();
  let token: string | undefined;
  // 1) Tenta reutilizar token salvo se solicitado
  if (useSaved && !skipAuth) {
    try {
      const savedRaw = readFileSync(join(__dirname, '..', '.bench', 'last-token.json'), 'utf8');
      const saved = JSON.parse(savedRaw);
      if (saved?.token) token = saved.token as string;
    } catch {}
  }

  // 2) Obtém token via login/register, caso não tenha ainda e auth não esteja desabilitada
  if (!token && !skipAuth) {
    if (emailArg && passArg) {
      token = await loginWith(emailArg, passArg);
      if (!token) {
        // tenta registrar e logar com as credenciais fornecidas
        try {
          const base = BASE.replace(/\/$/, '');
          await fetch(`${base}/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'Bench Provided', email: emailArg, password: passArg }),
          });
          token = await loginWith(emailArg, passArg);
        } catch {}
      }
    }
    if (!token) {
      token = await registerAndLoginFallback();
    }
    // persiste o primeiro token obtido para reutilização futura
    if (token) {
      try {
        const savePath = join(__dirname, '..', '.bench', 'last-token.json');
        mkdirSync(join(__dirname, '..', '.bench'), { recursive: true });
        writeFileSync(
          savePath,
          JSON.stringify({ token, createdAt: new Date().toISOString(), email: emailArg || null }, null, 2)
        );
      } catch {}
    }
  }

  const resultsDir = join(__dirname, '..', '.bench', 'results', String(Date.now()));
  mkdirSync(resultsDir, { recursive: true });

  const headers: Record<string, string> = {};
  if (token) headers['authorization'] = `Bearer ${token}`;

  // Opcionalmente, também benchmark da rota de login (POST /auth/login)
  if (benchLogin) {
    const base = BASE.replace(/\/$/, '');
    const url = `${base}/auth/login`;
    if (!(emailArg && passArg)) {
      console.warn('Pulando bench de /auth/login: falta --email e/ou --password');
    } else {
      console.log(`\n=== Benchmarking [POST] ${url} (login) ===`);
      try {
        const result = await new Promise<autocannon.Result>((resolve, reject) => {
          const instance = autocannon(
            {
              url,
              connections,
              duration,
              pipelining,
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email: emailArg, password: passArg }),
            },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          autocannon.track(instance, { renderProgressBar: true });
        });
        const outFile = join(resultsDir, `POST__auth_login.json`);
        writeFileSync(outFile, JSON.stringify(result, null, 2));
        console.log(`Saved: ${outFile}`);
      } catch (e) {
        console.warn(`Failed: [POST] ${url}`, e instanceof Error ? e.message : e);
      }
    }
  }

  for (const r of routes) {
    if (!onlyMethods.includes(r.method.toUpperCase())) continue;
    if (r.method.toUpperCase() !== 'GET') continue; // safety: GET-only
    const path = replaceParams(r.path);
    const url = `${BASE.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    console.log(`\n=== Benchmarking [${r.method}] ${url} ===`);
    try {
      const result = await new Promise<autocannon.Result>((resolve, reject) => {
        const instance = autocannon(
          {
            url,
            connections,
            duration,
            pipelining,
            method: 'GET',
            headers,
          },
          (err, res) => (err ? reject(err) : resolve(res))
        );
        autocannon.track(instance, { renderProgressBar: true });
      });
      const outFile = join(resultsDir, `${r.method}_${path.replace(/\//g, '_') || 'root'}.json`);
      writeFileSync(outFile, JSON.stringify(result, null, 2));
      console.log(`Saved: ${outFile}`);
    } catch (e) {
      console.warn(`Failed: [${r.method}] ${url}`, e instanceof Error ? e.message : e);
    }
  }
}

run();
