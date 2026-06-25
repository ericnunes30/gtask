/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
/**
 * Quality Gate - Manager Group (Backend)
 * Mede os Niveis 1 (Integridade) e 2 (Confiabilidade) definidos em /.docs/quality-gates.md
 *
 * Uso:
 *   npm run quality-gate            # roda tudo e reporta
 *   npm run quality-gate -- --gate  # interrompe no primeiro nivel que nao esta 100% verde
 *
 * Simbolos:
 *   ✓ passou   ✗ falhou   ○ pendente (falta ferramenta ou medicao manual)
 *
 * Exit code: 1 se houver qualquer falha. Pendentes nao falham o exit
 * (so alertam), exceto no modo --gate onde pendentes bloqueiam o avanco.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Result = { pass: boolean; measured: boolean; detail: string };
type JestJsonReport = { numPassedTests?: number; numFailedTests?: number } | null;
type Criterion = {
  id: string;
  nivel: 1 | 2;
  nome: string;
  run: () => Result | Promise<Result>;
};

// ---------------------------------------------------------------------------
// Caminhos
// ---------------------------------------------------------------------------
const SCRIPT_DIR = __dirname; // backend/scripts
const BACKEND_DIR = path.resolve(SCRIPT_DIR, '..'); // backend
const ROOT_DIR = path.resolve(BACKEND_DIR, '..'); // repo root
const SRC_DIR = path.resolve(BACKEND_DIR, 'src');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function run(
  cmd: string,
  opts: { cwd?: string; timeout?: number } = {},
): { exit: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf8',
      cwd: opts.cwd ?? BACKEND_DIR,
      timeout: opts.timeout ?? 180_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 100 * 1024 * 1024,
    });
    return { exit: 0, stdout: stdout ?? '', stderr: '' };
  } catch (e: any) {
    return {
      exit: e.status ?? 1,
      stdout: e.stdout?.toString?.() ?? '',
      stderr: e.stderr?.toString?.() ?? '',
    };
  }
}

function binInstalled(bin: string): boolean {
  return existsSync(path.join(BACKEND_DIR, 'node_modules', '.bin', bin));
}

function readJsonFile(p: string): any {
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** Le .docs/exceptions.md e retorna os nomes de pacotes excetuados para o criterio 1.7. */
function readExceptions17(): string[] {
  const file = path.join(ROOT_DIR, '.docs', 'exceptions.md');
  if (!existsSync(file)) return [];
  const content = readFileSync(file, 'utf8');
  const match = content.match(/## 1\.7[\s\S]*?(?=\n## |$)/);
  if (!match) return [];
  const pkgs: string[] = [];
  for (const line of match[0].split('\n')) {
    const m = line.match(/^\s*-\s*([@\w\-/]+)/);
    if (m) pkgs.push(m[1]);
  }
  return pkgs;
}

/** Conta ocorrencias de uma regex em todos os .ts de src (nao-spec) */
function countInSrc(regex: RegExp): number {
  let n = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (full.endsWith('.ts') && !full.endsWith('.spec.ts')) {
        const content = readFileSync(full, 'utf8');
        const m = content.match(regex);
        if (m) n += m.length;
      }
    }
  };
  walk(SRC_DIR);
  return n;
}

// ---------------------------------------------------------------------------
// ESLint: dois passes memoizados
// ---------------------------------------------------------------------------
type LintMessage = { ruleId: string | null; message: string; severity: number };
type LintFileResult = { messages: LintMessage[]; errorCount: number; warningCount: number };
type LintReport = LintFileResult[];

let _projectLint: LintReport | null = null;
let _extraLint: LintReport | null = null;

function lintProject(): LintReport {
  if (_projectLint) return _projectLint;
  const r = run('npx eslint src/ -f json', { timeout: 240_000 });
  let report: LintReport;
  try {
    report = JSON.parse(r.stdout || '[]');
  } catch {
    report = [];
  }
  _projectLint = report;
  return report;
}

function lintWithExtraRules(): LintReport {
  if (_extraLint) return _extraLint;
  // Config flat temporaria que estende a do projeto e adiciona as regras dos criterios.
  const tmpConfig = path.join(BACKEND_DIR, 'eslint.qg.mjs');
  const body = `
import base from './eslint.config.mjs';
export default [
  ...base,
  {
    rules: {
      'no-console': ['error', { allow: ['error'] }],
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'hack', 'xxx'], location: 'anywhere' }],
      'no-unreachable': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'complexity': ['error', 15],
    },
  },
  // Respeita excecao do projeto: console permitido em CLI commands e migrations
  {
    files: ['src/commands/**', 'src/database/migrations/**'],
    rules: { 'no-console': 'off', 'max-lines': 'off' },
  },
  // Modulo whatsapp: integracao futura (ver .docs/modules-status.md).
  // N2.5 (max-lines) e N2.9 (complexity) nao aplicam ate o modulo
  // ser promovido a feature ativa.
  {
    files: ['src/modules/whatsapp/**/*.ts'],
    rules: { 'max-lines': 'off', 'complexity': 'off' },
  },
];
`;
  writeFileSync(tmpConfig, body, 'utf8');
  try {
    const r = run('npx eslint src/ --config eslint.qg.mjs -f json', { timeout: 240_000 });
    let report: LintReport;
    try {
      report = JSON.parse(r.stdout || '[]');
    } catch {
      report = [];
    }
    _extraLint = report;
  } finally {
    try { unlinkSync(tmpConfig); } catch { /* noop */ }
  }
  return _extraLint!;
}

function countRule(report: LintReport, ruleId: string): number {
  let n = 0;
  for (const f of report) for (const m of f.messages) if (m.ruleId === ruleId) n++;
  return n;
}

function totalErrors(report: LintReport): number {
  return report.reduce((s, f) => s + f.errorCount, 0);
}
function totalWarnings(report: LintReport): number {
  return report.reduce((s, f) => s + f.warningCount, 0);
}

// ---------------------------------------------------------------------------
// Nivel 1 - Integridade
// ---------------------------------------------------------------------------
const nivel1: Criterion[] = [
  {
    id: '1.1',
    nivel: 1,
    nome: 'Build limpo (tsc --noEmit)',
    run: () => {
      const r = run('npx tsc --noEmit', { timeout: 180_000 });
      const errs = (r.stdout.match(/error TS/g) || []).length;
      return {
        pass: r.exit === 0,
        measured: true,
        detail: r.exit === 0 ? 'zero erros de compilacao' : `${errs} erro(s) de compilacao`,
      };
    },
  },
  {
    id: '1.2',
    nivel: 1,
    nome: 'Lint zero erros (max-warnings=0)',
    run: () => {
      const rep = lintProject();
      const e = totalErrors(rep);
      const w = totalWarnings(rep);
      return {
        pass: e === 0 && w === 0,
        measured: true,
        detail: `${e} erro(s), ${w} warning(s)`,
      };
    },
  },
  {
    id: '1.3',
    nivel: 1,
    nome: 'Formatacao consistente (prettier --check)',
    run: () => {
      const r = run('npx prettier --check "src/**/*.ts"', { timeout: 120_000 });
      return {
        pass: r.exit === 0,
        measured: true,
        detail: r.exit === 0
          ? 'todos os arquivos formatados'
          : 'exit nao-zero - verifique CRLF/LF (rodar `prettier --check` p/ detalhes)',
      };
    },
  },
  {
    id: '1.4',
    nivel: 1,
    nome: 'TypeScript strict habilitado',
    run: () => {
      try {
        const ts = readJsonFile(path.join(BACKEND_DIR, 'tsconfig.json'));
        const strict = ts?.compilerOptions?.strict === true;
        return {
          pass: strict,
          measured: true,
          detail: strict ? '"strict": true' : 'strict ausente (projeto usa regras parciais)',
        };
      } catch (e: any) {
        return { pass: false, measured: true, detail: `falha ao ler tsconfig: ${e.message}` };
      }
    },
  },
  {
    id: '1.5',
    nivel: 1,
    nome: 'Sem console.log em producao',
    run: () => {
      const n = countRule(lintWithExtraRules(), 'no-console');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} violacao(oes)` };
    },
  },
  {
    id: '1.6',
    nivel: 1,
    nome: 'Sem TODO/FIXME no codigo produtivo',
    run: () => {
      const n = countRule(lintWithExtraRules(), 'no-warning-comments');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} violacao(oes)` };
    },
  },
  {
    id: '1.7',
    nivel: 1,
    nome: 'Sem dependencias mortas (depcheck)',
    run: () => {
      if (!binInstalled('depcheck')) {
        return {
          pass: false,
          measured: false,
          detail: 'depcheck nao instalado (npm i -D depcheck)',
        };
      }
      const r = run('npx depcheck --json', { timeout: 120_000 });
      try {
        const j = JSON.parse(r.stdout || '{}');
        const arr = (v: any): string[] => (Array.isArray(v) ? v : Object.keys(v || {}));
        const all = [...arr(j.dependencies), ...arr(j.devDependencies)];
        const excepted = readExceptions17();
        const real = all.filter((d) => !excepted.includes(d));
        return {
          pass: real.length === 0,
          measured: true,
          detail: real.length === 0
            ? 'zero dependencias nao utilizadas'
            : `${real.length} nao utilizada(s): ${real.join(', ')}`,
        };
      } catch {
        return { pass: false, measured: true, detail: 'falha ao parsear depcheck' };
      }
    },
  },
  {
    id: '1.9',
    nivel: 1,
    nome: 'Sem codigo inalcançavel (no-unreachable)',
    run: () => {
      const n = countRule(lintWithExtraRules(), 'no-unreachable');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} violacao(oes)` };
    },
  },
  {
    id: '1.10',
    nivel: 1,
    nome: 'Sem variaveis importadas e nao utilizadas',
    run: () => {
      const n = countRule(lintWithExtraRules(), '@typescript-eslint/no-unused-vars');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} violacao(oes)` };
    },
  },
  {
    id: '1.11',
    nivel: 1,
    nome: 'Sem imports nao resolvidos',
    run: () => {
      const n = countRule(lintProject(), 'import/no-unresolved');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} import(s) nao resolvido(s)` };
    },
  },
  {
    id: '1.12',
    nivel: 1,
    nome: 'Sem arquivos mortos no src (unimported)',
    run: () => {
      if (!binInstalled('unimported')) {
        return {
          pass: false,
          measured: false,
          detail: 'unimported nao instalado (npm i -D unimported)',
        };
      }
      const r = run('npx unimported --no-cache', { timeout: 180_000 });
      const deadMatch = r.stdout.match(/unimported files?\s+\[?(\d+)\]?/i) || r.stdout.match(/(\d+)\s+unimported/i);
      const dead = deadMatch ? parseInt(deadMatch[1], 10) : -1;
      if (dead === -1) {
        return { pass: false, measured: true, detail: 'falha ao medir arquivos mortos - rode npx unimported' };
      }
      return {
        pass: dead === 0,
        measured: true,
        detail: dead === 0 ? 'zero arquivos mortos' : `${dead} arquivo(s) morto(s) - rode npx unimported`,
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Nivel 2 - Confiabilidade
// ---------------------------------------------------------------------------
const nivel2: Criterion[] = [
  {
    id: '2.1',
    nivel: 2,
    nome: 'Testes unitarios por modulo critico (>=1 spec)',
    run: () => {
      const modulos = ['auth', 'tasks', 'notification', 'comment', 'project'];
      const faltantes: string[] = [];
      for (const m of modulos) {
        const dir = path.join(SRC_DIR, 'modules', m);
        let hasSpec = false;
        if (existsSync(dir)) {
          const walk = (d: string) => {
            for (const entry of readdirSync(d)) {
              const full = path.join(d, entry);
              if (statSync(full).isDirectory()) walk(full);
              else if (full.endsWith('.spec.ts')) hasSpec = true;
            }
          };
          walk(dir);
        }
        if (!hasSpec) faltantes.push(m);
      }
      return {
        pass: faltantes.length === 0,
        measured: true,
        detail: faltantes.length === 0
          ? `spec presente em todos os ${modulos.length} modulos`
          : `sem spec: ${faltantes.join(', ')}`,
      };
    },
  },
  {
    id: '2.2',
    nivel: 2,
    nome: 'Suite de testes passa (jest)',
    run: () => {
      const r = run('npx jest --passWithNoTests --json', { timeout: 300_000 });
      let report: JestJsonReport = null;
      try {
        const stdout = r.stdout;
        const jsonStart = stdout.indexOf('{');
        const jsonStr = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
        report = JSON.parse(jsonStr) as unknown as JestJsonReport;
      } catch {
        report = null;
      }
      const passed = report?.numPassedTests ?? 0;
      const failed = report?.numFailedTests ?? 0;
      return {
        pass: r.exit === 0 && failed === 0,
        measured: true,
        detail: r.exit === 0 ? `${passed} teste(s) passando` : `${failed} teste(s) falhando`,
      };
    },
  },
  {
    id: '2.3',
    nivel: 2,
    nome: 'Cobertura minima de 20%',
    run: () => {
      const r = run(
        'npx jest --coverage --coverageReporters=json-summary --passWithNoTests',
        { timeout: 300_000 },
      );
      const summaryPath = path.join(BACKEND_DIR, 'coverage', 'coverage-summary.json');
      if (!existsSync(summaryPath)) {
        return { pass: false, measured: true, detail: 'sem testes/cobertura gerada (jest --passWithNoTests sem specs)' };
      }
      try {
        const j = readJsonFile(summaryPath);
        const t = j?.total || {};
        const pct = (k: string) => (t[k]?.pct ?? 0);
        const min = 20;
        const cats = ['branches', 'functions', 'lines', 'statements'];
        const abaixo = cats.filter((c) => pct(c) < min);
        const detalhe = cats.map((c) => `${c}:${pct(c)}%`).join(' ');
        return {
          pass: abaixo.length === 0,
          measured: true,
          detail: abaixo.length === 0 ? `${detalhe} (>= ${min}%)` : `abaixo de ${min}%: ${abaixo.join(', ')} | ${detalhe}`,
        };
      } catch (e: any) {
        return { pass: false, measured: true, detail: `falha ao ler coverage: ${e.message}` };
      }
    },
  },
  {
    id: '2.4',
    nivel: 2,
    nome: 'Sem `any` explicito (no-explicit-any)',
    run: () => {
      const n = countRule(lintWithExtraRules(), '@typescript-eslint/no-explicit-any');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} uso(s) de any` };
    },
  },
  {
    id: '2.5',
    nivel: 2,
    nome: 'Maximo 300 linhas por arquivo (max-lines)',
    run: () => {
      const n = countRule(lintWithExtraRules(), 'max-lines');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} arquivo(s) acima de 300 linhas` };
    },
  },
  {
    id: '2.6',
    nivel: 2,
    nome: 'Maximo 3 responsabilidades por classe (inspecao manual)',
    run: () => {
      return {
        pass: false,
        measured: false,
        detail: 'criterio manual - revisar classes > 200 linhas',
      };
    },
  },
  {
    id: '2.7',
    nivel: 2,
    nome: 'Guards de autenticacao consistentes (JwtAuthGuard)',
    run: () => {
      // Excecoes: auth.controller (rotas publicas: login/register)
      // e whatsapp (integracao futura - ver .docs/modules-status.md)
      const dirs = ['src/modules'];
      const excluded = /(^|[\\/])auth[\\/]controllers[\\/]auth\.controller\.ts|(^|[\\/])modules[\\/]whatsapp[\\/]/;
      let totalGuards = 0;
      let jwtGuards = 0;
      const re = /@UseGuards\(/g;
      const reJwt = /@UseGuards\(JwtAuthGuard\)/g;
      const walk = (dir: string) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const fp = path.join(dir, e.name);
          if (e.isDirectory()) walk(fp);
          else if (e.isFile() && e.name.endsWith('.ts') && !excluded.test(fp)) {
            const content = readFileSync(fp, 'utf8');
            totalGuards += (content.match(re) || []).length;
            jwtGuards += (content.match(reJwt) || []).length;
          }
        }
      };
      for (const d of dirs) walk(path.join(BACKEND_DIR, d));
      const consistentes = totalGuards > 0 && totalGuards === jwtGuards;
      return {
        pass: consistentes,
        measured: true,
        detail: `${jwtGuards}/${totalGuards} @UseGuards sao JwtAuthGuard (excluindo auth.controller e whatsapp)`,
      };
    },
  },
  {
    id: '2.8',
    nivel: 2,
    nome: 'Migrations ativas (synchronize:false + migrationsRun:true)',
    run: () => {
      try {
        const app = readFileSync(path.join(SRC_DIR, 'app.module.ts'), 'utf8');
        const dbConfig = readFileSync(
          path.join(SRC_DIR, 'database', 'database.config.ts'),
          'utf8',
        );
        const source = app + dbConfig;
        const syncFalse = /synchronize\s*:\s*false/.test(source);
        const migRunTrue = /migrationsRun\s*:\s*true/.test(source);
        return {
          pass: syncFalse && migRunTrue,
          measured: true,
          detail: `synchronize:${syncFalse ? 'false ✓' : 'nao/false ✗'} | migrationsRun:${migRunTrue ? 'true ✓' : 'nao/true ✗'}`,
        };
      } catch (e: any) {
        return { pass: false, measured: true, detail: `falha ao ler config: ${e.message}` };
      }
    },
  },
  {
    id: '2.9',
    nivel: 2,
    nome: 'Complexidade ciclomatica < 15 por metodo',
    run: () => {
      const n = countRule(lintWithExtraRules(), 'complexity');
      return { pass: n === 0, measured: true, detail: n === 0 ? 'zero violacoes' : `${n} metodo(s) com complexidade >= 15` };
    },
  },
  {
    id: '2.10',
    nivel: 2,
    nome: 'Sem duplicacao de codigo > 10 linhas',
    run: () => {
      if (!binInstalled('jscpd')) {
        return {
          pass: false,
          measured: false,
          detail: 'jscpd nao instalado (npm i -D jscpd) - ou inspecao manual',
        };
      }
      const r = run('npx jscpd src/ --reporters json', { timeout: 180_000 });
      try {
        const j = readJsonFile(path.join(BACKEND_DIR, 'jscpd-report', 'jscpd-report.json'));
        const dup = j?.statistics?.duplicates || 0;
        return { pass: dup === 0, measured: true, detail: `${dup} bloco(s) duplicado(s)` };
      } catch {
        return { pass: false, measured: true, detail: 'falha ao parsear jscpd' };
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Runner / relatorio
// ---------------------------------------------------------------------------
const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function symbolOf(r: Result): string {
  if (!r.measured) return C.yellow('○');
  return r.pass ? C.green('✓') : C.red('✗');
}

function printLevel(titulo: string, criteria: Criterion[], results: Map<string, Result>) {
  console.log(C.bold(C.cyan(`\n=== ${titulo} ===`)));
  let pass = 0, fail = 0, pend = 0;
  for (const c of criteria) {
    const r = results.get(c.id)!;
    if (!r.measured) pend++;
    else if (r.pass) pass++;
    else fail++;
    console.log(`  ${symbolOf(r)} ${C.dim(c.id.padEnd(5))} ${c.nome.padEnd(55)} ${C.dim(r.detail)}`);
  }
  const total = criteria.length;
  console.log(C.dim(`  -- ${pass} passam | ${fail} falham | ${pend} pendente (total ${total})`));
  return { pass, fail, pend };
}

async function main() {
  const gate = process.argv.includes('--gate');
  console.log(C.bold('Quality Gate - Manager Group (Backend)'));
  console.log(C.dim(`modo: ${gate ? '--gate (interrompe no primeiro nivel nao-verde)' : 'report (roda tudo)'}`));

  const all: Criterion[] = [...nivel1, ...nivel2];
  const results = new Map<string, Result>();

  // Executa nivel por nivel (para respeitar --gate)
  const levels: { titulo: string; criteria: Criterion[] }[] = [
    { titulo: 'Nivel 1 - Integridade', criteria: nivel1 },
    { titulo: 'Nivel 2 - Confiabilidade', criteria: nivel2 },
  ];

  let anyFail = false;
  for (const lvl of levels) {
    for (const c of lvl.criteria) {
      process.stdout.write(C.dim(`  medindo ${c.id} ${c.nome}...`));
      try {
        const r = await c.run();
        results.set(c.id, r);
        if (!r.measured || !r.pass) anyFail = true;
        process.stdout.write(`\r${' '.repeat(70)}\r`);
      } catch (e: any) {
        results.set(c.id, { pass: false, measured: true, detail: `erro na medicao: ${e.message}` });
        anyFail = true;
        process.stdout.write(`\r${' '.repeat(70)}\r`);
      }
    }
    const res = printLevel(lvl.titulo, lvl.criteria, results);
    if (gate && (res.fail > 0 || res.pend > 0)) {
      console.log(C.yellow(`\n[gate] Nivel nao esta 100% verde - interrompendo.`));
      break;
    }
  }

  console.log('');
  if (anyFail) {
    console.log(C.red('Resultado: existem falhas pendentes de correcao.'));
  } else {
    console.log(C.green('Resultado: todos os criterios medidos passaram.'));
  }
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error(C.red(`Erro fatal: ${e?.message ?? e}`));
  process.exit(1);
});