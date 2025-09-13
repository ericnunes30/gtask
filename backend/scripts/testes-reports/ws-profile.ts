/* Start server under 0x and run WS bench */
import { spawn } from 'child_process';
import { join } from 'path';

async function runCmd(cmd: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(process.platform === 'win32' ? `${cmd}.cmd` : cmd, args, { cwd, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed`))));
  });
}

async function waitForReady(cwd: string) {
  await new Promise<void>((resolve) => setTimeout(resolve, 5000));
}

async function main() {
  const cwd = join(__dirname, '..');
  await runCmd('npm', ['run', 'build'], cwd);
  const args = ['0x', '--output-dir', '0x', '--', 'node', 'dist/main.js'];
  const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] });
  await waitForReady(cwd);

  const passArgs = process.argv.slice(2);
  await runCmd('npx', ['ts-node', 'scripts/ws-bench.ts', ...passArgs], cwd);

  server.kill('SIGINT');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

