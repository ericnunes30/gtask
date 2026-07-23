/* eslint-disable no-console */
/**
 * Orchestrates E2E tests inside Docker Compose test infrastructure.
 * Ensures containers are torn down even if tests fail.
 */
import { execSync } from 'node:child_process';
import * as path from 'node:path';

const SCRIPT_DIR = __dirname;
const BACKEND_DIR = path.resolve(SCRIPT_DIR, '..');
const ROOT_DIR = path.resolve(BACKEND_DIR, '..');
const COMPOSE_FILE = path.join(ROOT_DIR, 'docker-compose.test.yml');

function run(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

async function main(): Promise<number> {
  let exitCode = 0;

  try {
    console.log('[test:e2e:docker] Starting test containers...');
    run(`docker-compose -f "${COMPOSE_FILE}" up -d`, BACKEND_DIR);

    console.log('[test:e2e:docker] Waiting for Postgres to be ready...');
    // Wait for healthcheck to pass (max ~60s)
    const start = Date.now();
    const timeout = 60_000;
    let ready = false;
    while (Date.now() - start < timeout) {
      try {
        execSync(`docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U postgres`, {
          cwd: BACKEND_DIR,
          stdio: 'ignore',
          timeout: 5_000,
        });
        ready = true;
        break;
      } catch {
        // not ready yet
      }
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }

    if (!ready) {
      console.error('[test:e2e:docker] Postgres did not become ready in time.');
      exitCode = 1;
    } else {
      console.log('[test:e2e:docker] Running E2E tests...');
      try {
        run('npm run test:e2e', BACKEND_DIR);
      } catch (e: any) {
        exitCode = typeof e.status === 'number' ? e.status : 1;
      }
    }
  } catch (e: any) {
    console.error('[test:e2e:docker] Unexpected error:', e.message);
    exitCode = 1;
  } finally {
    console.log('[test:e2e:docker] Stopping test containers...');
    try {
      run(`docker-compose -f "${COMPOSE_FILE}" down`, BACKEND_DIR);
    } catch {
      // ignore cleanup errors
    }
  }

  return exitCode;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error('[test:e2e:docker] Fatal error:', err);
    process.exit(1);
  });
