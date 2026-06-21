# Auditoria dos `package.json` — Backend e Frontend

Repositório: `manager-group`  
Data: 2026-06-21  
Node: `v24.15.0` · npm: `11.12.1`

---

## 1. Resumo executivo

| Projeto | `package.json` | `package-lock.json` | Estado |
|---|---|:---:|---|
| `backend/` | ✅ existe | ✅ existe | 🟡 **Funcional, mas com débito técnico** |
| `frontend/` | ❌ **ausente** | ❌ ausente | 🔴 **Bloqueante** |
| Raiz | ❌ ausente | ❌ ausente | 🟡 Workspaces não usados |

**Conclusão:** o backend tem dependências desatualizadas e vulnerabilidades
conhecidas; o frontend **não tem `package.json`**, o que impede qualquer
instalação/build no frontend. Isso precisa ser corrigido antes de
qualquer evolução no frontend.

---

## 2. Backend — `backend/package.json`

### 2.1 Metadados

```json
{
  "name": "backend-2",
  "version": "0.0.1",
  "private": true,
  "license": "UNLICENSED"
}
```

**Observações:**
- `name` genérico (`backend-2`) — não reflete o projeto `manager-group`.
- Sem `description`, `author`, `repository`, `bugs`, `homepage`.
- Sem campo `engines` — não documenta a versão mínima de Node/npm.
- Versão `0.0.1` — aceitável para MVP, mas pode ser atualizada após
  releases estáveis.

### 2.2 Scripts

| Script | Comando | Avaliação |
|---|---|:---|
| `build` | `tsc` | ✅ ok |
| `start` | `nest start` | ✅ ok |
| `start:dev` | `nest start --watch` | ✅ ok |
| `start:prod` | `node dist/main` | ✅ ok |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | ⚠️ **Sempre usa `--fix`**; em CI deveria ser sem `--fix` |
| `format` | `prettier --write ...` | ⚠️ **Sempre formata**; em CI deveria ser `--check` |
| `test` | `jest` | ✅ ok |
| `test:cov` | `jest --coverage` | ✅ ok |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | ✅ ok |
| `console` | `ts-node src/console.ts` | ✅ ok |
| `quality-gate` | `ts-node-dev scripts/quality-gate.ts` | ✅ ok |
| `db:migrate` | `node dist/console.js db:migrate` | ✅ ok |
| `profile` / `bench` / `ws:bench` | vários | ⚠️ Ferramentas de perf — úteis, mas poluem scripts principais |

**Problemas:**
1. **Não há scripts TypeORM oficiais** (`migration:run`, `migration:generate`,
   `migration:revert`, `migration:show`). O `README.md` de `src/migrations/`
   menciona scripts que não existem.
2. `lint` e `format` usam `--fix`/`--write`. Isso mascara violações em CI.
   Recomendo adicionar:
   ```json
   "lint:check": "eslint \"{src,apps,libs,test}/**/*.ts\"",
   "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\""
   ```
3. `test:debug` aponta para `node_modules/.bin/jest`, que pode não existir
   no Windows sem symlink. Melhor usar `npx jest`.

### 2.3 Dependências de runtime (`dependencies`)

#### ✅ Bem colocadas

- `@nestjs/*` — ecossistema NestJS
- `typeorm` + `pg` — ORM e driver PostgreSQL
- `bcrypt` / `scrypt-js` — hashing de senhas
- `passport`, `passport-jwt`, `passport-local` — autenticação
- `class-validator`, `class-transformer` — validação DTOs
- `rxjs`, `reflect-metadata` — necessários para NestJS/TypeORM

#### ⚠️ Questões

| Pacote | Status | Observação |
|---|---|---|
| `@types/luxon` | ❌ em `dependencies` | Tipos devem estar em `devDependencies` |
| `@sentry/node` | 🟡 presente | Útil, mas se não configurado no código, pode ser removido |
| `cron-parser` | ✅ | Runtime usado em `scheduler.service.ts` |
| `luxon` | ✅ | Runtime |
| `nest-commander` | ✅ | CLI customizado |
| `@nestjs/axios` | 🟡 | Verificar se é usado no código |

### 2.4 Dependências de desenvolvimento (`devDependencies`)

#### ✅ Bem colocadas

- `typescript`, `ts-node`, `ts-node-dev`, `tsconfig-paths`
- `jest`, `ts-jest`
- `eslint`, `prettier`, `typescript-eslint`
- `@types/*`
- `depcheck` — usado pelo Quality Gate

#### ⚠️ Questões

| Pacote | Status | Observação |
|---|---|---|
| `0x` | 🟡 | Ferramenta de profiling flamegraph; pesada. Manter só se usada |
| `autocannon` | 🟡 | Benchmark HTTP; pode ser devDependency |
| `@types/luxon` | ❌ deveria estar aqui | Está em `dependencies` |

### 2.5 Versões e atualizações

Rodando `npm outdated`:

**Atualizações recomendadas (patch/minor, baixo risco):**

- `@nestjs/common` `11.1.6` → `11.1.27`
- `@nestjs/core` `11.1.6` → `11.1.27`
- `@nestjs/config` `4.0.2` → `4.0.4`
- `@nestjs/jwt` `11.0.0` → `11.0.2`
- `@nestjs/typeorm` `11.0.0` → `11.0.2`
- `@nestjs/throttler` `6.4.0` → `6.5.0`
- `class-validator` `0.14.2` → `0.14.4` (patch)
- `typeorm` `0.3.20` → verificar patch mais recente

**Atualizações de médio risco (major ou breaking):**

- `@sentry/node` `8.x` → `10.x` — **breaking change** no setup de instrumentação
- `bcrypt` `5.x` → `6.x` — possível breaking na API nativa
- `eslint` `9.x` → `10.x` — verificar compatibilidade com `typescript-eslint`
- `jest` `30.x` — acompanhar release candidates

### 2.6 Segurança — `npm audit`

```text
77 vulnerabilities (7 low, 41 moderate, 27 high, 2 critical)
```

**Vulnerabilidades críticas/high relevantes:**

| Pacote | Severidade | Advisory |
|---|---|---|
| `@nestjs/core` | high | GHSA-36xv-jgw5-4q75 — injection via `path-to-regexp` |
| `ws` (via `engine.io` / `socket.io-adapter`) | high | GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p |
| `@isaacs/brace-expansion` | high | GHSA-7h2j-956f-4vf2 |
| `@opentelemetry/core` (via `@sentry/node`) | moderate | GHSA-8988-4f7v-96qf |

**Recomendação:**
1. Rodar `npm audit fix` primeiro (sem `--force`) para corrigir o que for
   compatível.
2. Avaliar `npm audit fix --force` com cautela — pode instalar versões
   breaking (`@sentry/node@10`).
3. Fazer isso em branch separada e validar `tsc`, `lint` e `quality-gate`.

### 2.7 Configuração do Jest embutida

```json
"jest": {
  "rootDir": ".",
  "testMatch": ["**/src/**/*.spec.ts", "**/test/**/*.spec.ts"],
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage"
}
```

**Problemas:**
1. `coverageDirectory: "../coverage"` — a pasta de cobertura sai do
   `backend/` e vai para a raiz do repositório. Isso pode poluir a raiz.
2. `collectCoverageFrom: "**/*.(t|j)s"` — inclui `node_modules` e `dist` se
   não excluídos. Recomendo:
   ```json
   "collectCoverageFrom": ["src/**/*.(t|j)s", "!src/**/*.d.ts"]
   ```
3. Não há thresholds de cobertura — o critério 2.3 do QG (20%) não é
   garantido pela configuração. Adicionar:
   ```json
   "coverageThreshold": {
     "global": { "branches": 20, "functions": 20, "lines": 20, "statements": 20 }
   }
   ```

### 2.8 Falta de campos úteis

```json
{
  "engines": { "node": ">=22.0.0", "npm": ">=10.0.0" },
  "repository": { "type": "git", "url": "https://github.com/ericnunes30/manager-group" },
  "scripts": { "prepare": "husky || true" }
}
```

Recomendo adicionar:
- `engines`
- `repository`
- `keywords`
- `scripts` de CI (`lint:check`, `format:check`, `typecheck`)

---

## 3. Frontend — `frontend/package.json`

### 3.1 Estado atual

**🔴 `frontend/package.json` não existe.**

Apesar disso, o diretório `frontend/` contém:
- `node_modules/` (instalação anterior?)
- `dist/` (build anterior?)
- `components.json` (shadcn/ui)
- `tsconfig*.json`
- `eslint.config.js`
- `tailwind.config.ts`
- `vite.config.ts` (provável)

### 3.2 Impacto

Sem `package.json`:
- `npm install` não funciona no frontend
- Novo colaborador não consegue rodar o projeto
- CI/CD do frontend quebra
- Não é possível atualizar dependências
- Não é possível adicionar novas bibliotecas

### 3.3 Recomendação imediata

Recuperar ou recriar o `frontend/package.json`. O resumo mínimo baseado
no contexto do projeto (React + Vite + TypeScript + Tailwind + shadcn/ui)
seria:

```json
{
  "name": "manager-group-frontend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc \u0026\u0026 vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@dnd-kit/*": "^6.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "lucide-react": "^0.x",
    "date-fns": "^3.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "@radix-ui/*": "..."
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "autoprefixer": "^10.x",
    "eslint": "^9.x",
    "postcss": "^8.x",
    "prettier": "^3.x",
    "tailwindcss": "^3.x",
    "typescript": "^5.x",
    "vite": "^5.x"
  }
}
```

> ⚠️ As versões exatas devem ser recuperadas do `node_modules` atual ou
> do histórico do Git (`git log -- frontend/package.json`).

---

## 4. Raiz do repositório

Não há `package.json` na raiz. Isso é aceitável porque o projeto não usa
workspaces do npm/yarn/pnpm. As aplicações são independentes.

**Consideração futura:** se o projeto crescer, um workspace pode facilitar
scripts unificados (`npm run dev --workspace=frontend`). Não é urgente.

---

## 5. Problemas críticos por prioridade

| # | Problema | Onde | Severidade | Ação |
|---:|---|---|---|---|
| 1 | `frontend/package.json` ausente | `frontend/` | 🔴 Crítica | Recuperar/recirar imediatamente |
| 2 | 77 vulnerabilidades npm | `backend/` | 🔴 Alta | Rodar `npm audit fix` em branch separada |
| 3 | `@types/luxon` em `dependencies` | `backend/package.json` | 🟡 Média | Mover para `devDependencies` |
| 4 | `lint` e `format` com `--fix`/`--write` | `backend/package.json` | 🟡 Média | Adicionar scripts `*:check` |
| 5 | Scripts TypeORM ausentes | `backend/package.json` | 🟡 Média | Adicionar `migration:*` |
| 6 | `coverageDirectory` na raiz | `backend/package.json` | 🟢 Baixa | Mudar para `"./coverage"` |
| 7 | Sem `engines` | ambos | 🟢 Baixa | Documentar Node/npm |
| 8 | Nome genérico `backend-2` | `backend/package.json` | 🟢 Baixa | Renomear para `manager-group-backend` |

---

## 6. Próximos passos recomendados

1. **Recuperar `frontend/package.json`** — prioridade máxima.
2. **Criar branch `chore/backend-deps-audit`** para:
   - Rodar `npm audit fix` no backend
   - Mover `@types/luxon` para `devDependencies`
   - Adicionar scripts `lint:check` e `format:check`
   - Ajustar configuração do Jest
3. **Validar** com `npm run quality-gate`, `npm run build` e `npm run test:cov`.
4. **Só depois** considerar atualizações de minor versions no backend.

---

## 7. Comandos úteis para investigação futura

```bash
# Ver quais scripts realmente existem
npm run

# Ver dependências não usadas (já usado pelo QG)
npx depcheck

# Ver detalhes de uma vulnerabilidade específica
npm audit --json | jq '.vulnerabilities["@nestjs/core"]'

# Histórico do package.json do frontend (se existiu)
git log --all -- frontend/package.json
```
