import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

type Route = { method: string; path: string; source: string };

const controllersDir = join(__dirname, '..', 'src');

const httpDecorators = [
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'All',
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function discover(): Route[] {
  const files = walk(controllersDir).filter((f) => /controllers\\|controllers\//.test(f));
  const routes: Route[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    // Controller base path
    const ctrlMatch = src.match(/@Controller\(([^)]*)\)/);
    if (!ctrlMatch) continue;
    let base = '';
    try {
      const arg = ctrlMatch[1].trim();
      const str = arg.startsWith('`') || arg.startsWith("'") || arg.startsWith('"') ? eval(arg) : '';
      base = String(str || '').replace(/^\//, '').replace(/\/$/, '');
    } catch {
      continue;
    }
    // Methods
    const methodRegex = new RegExp(`@(${httpDecorators.join('|')})\\(([^)]*)\\)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = methodRegex.exec(src))) {
      const method = m[1].toUpperCase();
      const arg = (m[2] || '').trim();
      let sub = '';
      try {
        if (arg) {
          const parsed = arg.split(',')[0];
          if (parsed) {
            const val = parsed.trim();
            sub = eval(val); // string literal
          }
        }
      } catch {}
      const full = [base, sub].filter(Boolean).join('/');
      const path = `/${full}`.replace(/\/\/+/, '/');
      routes.push({ method: method === 'ALL' ? 'GET' : method, path, source: file });
    }
  }
  return routes;
}

function main() {
  const routes = discover();
  const outDir = join(__dirname, '..', '.bench');
  if (!existsSync(outDir)) mkdirSync(outDir);
  const outFile = join(outDir, 'routes.json');
  writeFileSync(outFile, JSON.stringify(routes, null, 2));
  console.log(outFile);
}

main();

