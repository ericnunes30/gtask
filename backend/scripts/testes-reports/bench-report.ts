import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

type Result = {
  url?: string;
  requests?: { average?: number } & Record<string, any>;
  latency?: { average?: number; p95?: number; p99?: number } & Record<string, any>;
  throughput?: { average?: number } & Record<string, any>;
  errors?: number;
  non2xx?: number;
};

function latestResultsDir(base: string): string | undefined {
  const resultsBase = join(base, '.bench', 'results');
  let dirs: string[] = [];
  try {
    dirs = readdirSync(resultsBase, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => Number(b) - Number(a));
  } catch {
    return undefined;
  }
  if (!dirs.length) return undefined;
  return join(resultsBase, dirs[0]);
}

function main() {
  const base = join(__dirname, '..');
  const dir = latestResultsDir(base);
  if (!dir) {
    console.error('Nenhum resultado encontrado em .bench/results');
    process.exit(1);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows = files.map((f) => {
    const data: Result = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const url = data.url || f.replace(/\.json$/, '');
    const p95 = data.latency?.p95 ?? data.latency?.average ?? 0;
    const p99 = data.latency?.p99 ?? 0;
    const rps = data.requests?.average ?? 0;
    const thr = data.throughput?.average ?? 0;
    const err = (data.errors || 0) + (data.non2xx || 0);
    return { url, p95, p99, rps, thr, err };
  });

  rows.sort((a, b) => (b.p95 || 0) - (a.p95 || 0));

  console.log('\n=== Top rotas por P95 (ms) ===');
  for (const r of rows) {
    console.log(
      `${r.p95?.toFixed(1).padStart(7)}ms p95 | ${String(r.rps?.toFixed(1)).padStart(8)} rps | err:${String(
        r.err || 0
      ).padStart(3)} | ${r.url}`,
    );
  }

  rows.sort((a, b) => (b.rps || 0) - (a.rps || 0));
  console.log('\n=== Top rotas por RPS ===');
  for (const r of rows.slice(0, 10)) {
    console.log(
      `${String(r.rps?.toFixed(1)).padStart(8)} rps | p95:${String(r.p95?.toFixed(1)).padStart(6)}ms | ${r.url}`,
    );
  }
}

main();

