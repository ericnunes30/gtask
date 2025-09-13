/*
 Orchestrates 0x profiler while bench-all runs GET endpoints.
*/
import { spawn } from 'child_process';
import { join } from 'path';

const API_PREFIX = process.env.API_PREFIX || 'api/v1';
const PORT = process.env.PORT || '3334';
const BASE = process.env.BASE_URL || `http://localhost:${PORT}/${API_PREFIX}`;

async function waitForReady(proc: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    const onData = (data: Buffer) => {
      const s = data.toString();
      if (s.includes('Application running on:')) {
        proc.stdout?.off('data', onData);
        resolve();
      }
    };
    proc.stdout?.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => resolve(), 5000); // fallback
  });
}

async function main() {
  const cwd = join(__dirname, '..');
  // Ensure build
  await new Promise<void>((resolve, reject) => {
    const b = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd, stdio: 'inherit' });
    b.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('build failed'))));
  });
  // Start 0x profiler
  const args = ['--output-dir', '0x', '--', 'node', 'dist/main.js'];
  const p = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['0x', ...args], { cwd, stdio: ['ignore', 'pipe', 'inherit'] });
  await waitForReady(p);

  // Run benches
  const passArgs = process.argv.slice(2);
  await new Promise<void>((resolve, reject) => {
    const ben = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'bench:all:get', '--', ...passArgs],
      { cwd, stdio: 'inherit' }
    );
    ben.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('bench failed'))));
  });

  // Stop server to let 0x process results
  p.kill('SIGINT');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
