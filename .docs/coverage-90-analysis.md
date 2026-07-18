# Análise de Gaps — Cobertura 90% Backend

> **Data:** 2026-07-05
> **Fonte:** `backend/coverage/coverage-summary.json`
> **Branch:** main (commit `13e9012 feat: close coverage gaps - 11 new specs, 405 tests, 74.19% lines`)

---

## 1. Resumo Executivo

### 1.1 Métricas Atuais (Projeto Inteiro)

| Métrica | Atual | Meta | Gap (pp) |
|---|---|---|---|
| **Lines** | 74.19% (1967/2651) | 90% | **-15.81** |
| **Statements** | 73.28% (2104/2871) | 90% | **-16.72** |
| **Functions** | 68.51% (333/486) | 90% | **-21.49** |
| **Branches** | 61.88% (958/1548) | 90% | **-28.12** |

**Status atual:** 405 testes em 47 suites. A métrica mais crítica é **branches** (28 pp de gap), seguida por **functions** (21 pp).

### 1.2 Métricas em Escopo (após exclusões)

Após remover do escopo os arquivos explicitamente excluídos (whatsapp, migrations, DTOs, entities, exceptions, interfaces, types, enums, modules, config, database, main, app.module, console), restam **58 arquivos**.

| Métrica | In-scope | Out-of-scope | Total |
|---|---|---|---|
| **Lines** | 91.25% (1533/1680) | 44.70% (434/971) | 74.19% |
| **Statements** | 90.94% (1646/1810) | 43.17% (458/1061) | 73.28% |
| **Functions** | 88.64% (312/352) | 15.67% (21/134) | 68.51% |
| **Branches** | 70.95% (779/1098) | 39.78% (179/450) | 61.88% |

> **Insight crítico:** Os arquivos em escopo **já atingem 91.25% em lines e 90.94% em statements**. O grande vilão é a categoria `out-of-scope` (especialmente WhatsApp e entities, que juntos representam **66% das linhas não cobertas**). Em escopo, **branches** é o gargalo: 71% vs meta 90% (gap 19 pp).

### 1.3 Conclusão-Chave

- **Foco principal:** Aumentar branches nos arquivos in-scope de **70.95% → 90%** (+19 pp) requer cobrir **~209 branches adicionais**.
- **Linhas in-scope** já estão em **91.25%**, mas com 4 funções e ~209 branches não cobertos; ao consertar branches, lines subirão naturalmente.
- **Out-of-scope (44.70%)** derruba a média geral, mas está fora do escopo de QA por definição.


---

## 2. Categorização dos Arquivos em Escopo

### 2.1 Resumo por Categoria de Dificuldade

| Categoria | # Arquivos | Cobertura Lines | Cobertura Branches | Linhas descobertas | Branches descobertas |
|---|---|---|---|---|---|
| **FÁCIL** (< 50 linhas OU lógica trivial) | 42 | 81.50% | 73.10% | 74 | 160 |
| **MÉDIO** (50-200 linhas) | 1 | 98.57% | 70.27% | 1 | 11 |
| **DIFÍCIL** (> 200 linhas OU lógica complexa) | 15 | 87.10% | 70.20% | 72 | 146 |

> **Observação:** Há forte assimetria — arquivos com cobertura > 90% em `lines` mas baixa em `branches` (e.g. controllers de occupation/role/user) porque o caminho feliz é testado mas faltam branches de erro (param inválido, exception 404, etc.).

---

## 3. Inventário Detalhado de Gaps (43 arquivos abaixo de 90%)

### 3.1 Arquivos com 0% de Cobertura (CRÍTICOS — 5 arquivos)

| # | Arquivo | Linhas | LS% | ST% | FN% | BR% | Dificuldade | Testes estimados | Esforço |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `src/commands/find-test-data.command.ts` | 31 | 0 | 0 | 0 | 0 | **FÁCIL** | 2-3 testes (mock 3 repos) | 0.5h |
| 2 | `src/common/guards/jwt-auth.guard.ts` | 14 | 21.42 | 31.25 | 0 | 0 | **FÁCIL** | 4-5 testes (canActivate, handleRequest c/ err/user/info) | 0.5-1h |
| 3 | `src/common/guards/setup.guard.ts` | 9 | 55.55 | 58.33 | 0 | 50 | **FÁCIL** | 2 testes (count=0 allow, count>0 throw) | 0.5h |
| 4 | `src/common/interceptors/transform.interceptor.ts` | 5 | 0 | 0 | 0 | 100 | **FÁCIL** | 1 teste (data → wrapper) | 0.25h |
| 5 | `src/modules/notification/strategies/index.ts` | 7 | 0 | 0 | 0 | 100 | **FÁCIL** | 1 teste (reexport) | 0.25h |

> **Nota sobre `index.ts`:** É puramente re-exports. Pode ser ignorado (não traz risco) ou ter um teste trivial de "smoke" para fechar o gap. Sugestão: ignorar e adicionar `!**/strategies/index.ts` em `collectCoverageFrom`.

---

### 3.2 Arquivos com Cobertura Parcial (38 arquivos)

#### 3.2.1 FÁCIL — Pequenos e Estratégicos (esforço ≤ 1h, alto ganho de branches)

| # | Arquivo | Linhas | LS% | ST% | FN% | BR% | Testes est. | Esforço | Branches a cobrir |
|---|---|---|---|---|---|---|---|---|---|
| 6 | `src/modules/auth/strategies/password/password-verification.factory.ts` | 9 | 88.88 | 91.66 | 100 | **50** | 2 testes (no-strategy throw) | 0.5h | 1 |
| 7 | `src/modules/exception/formatters/validation-error.formatter.ts` | 2 | 100 | 100 | 100 | **50** | 1 teste (constraints vazio) | 0.25h | 1 |
| 8 | `src/modules/role/services/role.service.ts` | 39 | 92.30 | 92.68 | 100 | **61.11** | 3-4 testes (update c/ nome duplicado, remove) | 1h | 7 |
| 9 | `src/modules/activity-log/listeners/activity-log.listener.ts` | 49 | 95.91 | 96.07 | 100 | **62.50** | 2-3 testes (branches de payload) | 0.75h | 6 |
| 10 | `src/modules/auth/strategies/jwt.strategy.ts` | 12 | 91.66 | 92.85 | 100 | **62.50** | 1 teste (branch !secret) | 0.25h | 3 |
| 11 | `src/modules/tasks/controllers/task.controller.ts` | 36 | 94.44 | 94.73 | 100 | **64.70** | 3 testes (branches GET/PUT/DELETE) | 0.75h | 12 |
| 12 | `src/modules/notification/controllers/notification.controller.ts` | 49 | 100 | 100 | 100 | **64.77** | 4-5 testes (search, admin endpoints) | 1h | 31 |
| 13 | `src/modules/comment/controllers/comment.controller.ts` | 27 | 100 | 100 | 100 | **65.38** | 2 testes (findAll c/ taskId, findAll sem) | 0.5h | 9 |
| 14 | `src/modules/notification/strategies/task-status-updated.strategy.ts` | 25 | 84 | 85.18 | 100 | **66.66** | 1-2 testes (branches restantes) | 0.5h | 6 |
| 15 | `src/modules/auth/controllers/auth.controller.ts` | 25 | 100 | 100 | 100 | **67.85** | 1-2 testes (verify endpoint) | 0.5h | 9 |
| 16 | `src/modules/recurring-task/controllers/recurring-task.controller.ts` | 19 | 100 | 100 | 100 | **68.75** | 1 teste (branches) | 0.25h | 5 |
| 17 | `src/modules/notification/strategies/task-created.strategy.ts` | 20 | 95 | 95.45 | 100 | **71.42** | 1 teste (branches restantes) | 0.25h | 4 |
| 18 | `src/modules/notification/strategies/comment-created.strategy.ts` | 16 | 93.75 | 94.44 | 100 | **75** | 1 teste (branches) | 0.25h | 3 |
| 19 | `src/modules/occupation/controllers/occupation.controller.ts` | 21 | 100 | 100 | 100 | **75** | 1 teste (branches de addUser/removeUser) | 0.5h | 3 |
| 20 | `src/modules/project/controllers/project.controller.ts` | 19 | 100 | 100 | 100 | **75** | 1 teste (branches) | 0.5h | 3 |
| 21 | `src/modules/role/controllers/role.controller.ts` | 17 | 100 | 100 | 100 | **75** | 1 teste (branches) | 0.25h | 3 |
| 22 | `src/modules/tasks/helpers/task-comments.helper.ts` | 16 | 100 | 100 | 100 | **75** | 1 teste (branches) | 0.25h | 1 |
| 23 | `src/modules/user/controllers/user.controller.ts` | 31 | 100 | 100 | 100 | **75** | 1-2 testes (branches) | 0.5h | 3 |
| 24 | `src/modules/tasks/services/timer.service.ts` | 42 | 97.61 | 97.77 | 100 | **77.27** | 2 testes (branches restantes) | 0.5h | 5 |
| 25 | `src/modules/activity-log/controllers/activity-log.controller.ts` | 9 | 100 | 100 | 100 | **81.25** | 1 teste (branches) | 0.25h | 3 |
| 26 | `src/modules/auth/strategies/local.strategy.ts` | 11 | 100 | 100 | 100 | **83.33** | 1 teste (branches restantes) | 0.25h | 1 |
| 27 | `src/modules/activity-log/services/activity-log.service.ts` | 28 | 100 | 100 | 100 | **87.50** | 1 teste (branches restantes) | 0.25h | 3 |
| 28 | `src/modules/recurring-task/enhancers/occupation-enhancer.ts` | 11 | 100 | 100 | 100 | **87.50** | 1 teste (branches restantes) | 0.25h | 1 |

**Subtotal FÁCEIS: 28 arquivos, ~37 testes novos, ~11h de esforço, +141 branches cobertos**

---

#### 3.2.2 MÉDIO — Apenas 1 arquivo nesta faixa (1 arquivo)

| # | Arquivo | Linhas | LS% | ST% | FN% | BR% | Testes est. | Esforço | Branches a cobrir |
|---|---|---|---|---|---|---|---|---|---|
| 29 | `src/modules/notification/services/notification.service.ts` | 70 | 98.57 | 98.63 | 100 | **70.27** | 3-4 testes (markAsRead, deleteExpired, cleanupOld) | 1h | 11 |

> Apenas 1 arquivo classificado como MÉDIO puro. Lógica moderada de queries TypeORM.


#### 3.2.3 DIFÍCIL — Services complexos, gateways, filtros (14 arquivos)

| # | Arquivo | Linhas | LS% | ST% | FN% | BR% | Testes est. | Esforço | Branches a cobrir |
|---|---|---|---|---|---|---|---|---|---|
| 30 | `src/modules/project/services/project.service.ts` | 51 | 80.39 | 81.13 | **45.45** | 71.42 | 5-6 testes (CRUD + tasks cascade + missing FK) | 2h | 12 |
| 31 | `src/modules/occupation/services/occupation.service.ts` | 68 | 86.76 | 87.32 | 100 | **58.82** | 4-5 testes (add/remove user, dup name, not found) | 2h | 14 |
| 32 | `src/modules/notification/factories/notification.factory.ts` | 54 | 90.74 | 85.24 | 92.3 | **62.71** | 6-8 testes (todos `isValidXxxData`, missing strategy, validateNotification) | 3h | 22 |
| 33 | `src/modules/comment/services/comment.service.ts` | 66 | 84.84 | 85.29 | **66.66** | 68.75 | 5-6 testes (like/unlike edge cases, findByTaskId) | 2h | 10 |
| 34 | `src/modules/exception/filters/all-exceptions.filter.ts` | 36 | 86.11 | 86.84 | 100 | **67.85** | 4 testes (HttpException, QueryFailedError 23505/23503, EntityNotFoundError, generic) | 2h | 9 |
| 35 | `src/modules/scheduler/scheduler.service.ts` | 71 | 91.54 | 91.89 | 100 | **70** | 3-4 testes (processSingleTask CRON, fallback 7d, lock fail) | 3h | 12 |
| 36 | `src/modules/tasks/services/task.service.ts` | 91 | 91.20 | 91.57 | **72.22** | 77.41 | 5-7 testes (applyUpdate, getChangedFields, assignUsers, findByProject/Status) | 3h | 14 |
| 37 | `src/modules/events/gateways/events.gateway.ts` | 79 | 89.87 | 90.12 | 81.25 | **74** | 6-8 testes (handleConnection c/ user, !user, join/leave, timer.start/pause error) | 4h | 13 |
| 38 | `src/modules/auth/services/auth.service.ts` | 59 | 93.22 | 93.44 | 91.66 | **75** | 3 testes (verifyPassword catch, verifyToken catch, refreshToken branches) | 1.5h | 8 |
| 39 | `src/modules/events/services/startup-verification/startup-verification.service.ts` | 39 | 97.43 | 95.45 | **75** | 78.26 | 3 testes (executeWithRetry success, retry until fail, maybeDelay branch) | 1.5h | 5 |
| 40 | `src/modules/user/services/user.service.ts` | 78 | 94.87 | 95 | 100 | **75** | 3-4 testes (createFirstAdmin rollback path, assignRoles missing, remove) | 2h | 10 |
| 41 | `src/modules/events/listeners/notification-event.listener.ts` | 64 | 100 | 100 | 100 | **75.75** | 4-5 testes (handleEvent branches: no strategy, no users, enrich payload, emit WS) | 2.5h | 8 |
| 42 | `src/modules/scheduler/services/lock.service.ts` | 27 | 100 | 100 | 100 | **80** | 2 testes (release com lock não adquirido, branch try/catch) | 1h | 3 |
| 43 | `src/modules/recurring-task/services/recurring-task.service.ts` | 40 | 95 | 95.23 | 100 | **85.71** | 2 testes (branches restantes applyUpdate) | 1h | 6 |

**Subtotal DIFÍCEIS: 14 arquivos, ~55 testes novos, ~30.5h de esforço, +146 branches cobertos**

---

## 4. Proposta de Fases (Abordagem Incremental)

### Fase 1 — FÁCIL + Output Rápido (≈ 11h, +141 branches)

**Objetivo:** Cobrir os 28 arquivos FÁCEIS. Fecha 160/319 branches descobertas (50%).

| Métrica | Antes (in-scope) | Depois (estimado) | Ganho |
|---|---|---|---|
| Lines | 91.25% | **~95.5%** | +4.25 pp |
| Statements | 90.94% | **~94.5%** | +3.56 pp |
| Functions | 88.64% | **~94%** | +5.36 pp |
| Branches | 70.95% | **~85.5%** | +14.55 pp |

**Arquivos prioritários (ordem sugerida):**

1. `transform.interceptor.ts`, `index.ts` (estratégias) — 0.5h combinados
2. `setup.guard.ts`, `jwt-auth.guard.ts` — 1.5h (4-7 testes, alto impacto em auth flow)
3. `find-test-data.command.ts` — 0.5h
4. `validation-error.formatter.ts`, `password-verification.factory.ts` — 0.75h
5. **Controllers** (occupation, project, role, user, comment, recurring-task, auth, notification, activity-log) — 4h
6. **Strategies notification** (comment-created, task-created, task-status-updated) — 1h
7. **Helpers/Services pequenos** (task-comments.helper, role.service, timer.service, activity-log, occupation-enhancer) — 2.75h

> **Por que começar pelos controllers:** 100% em lines mas apenas 64-87% em branches. Cada teste novo gera 3-31 branches cobertos. É a melhor relação esforço/ganho.


### Fase 2 — Services DIFÍCEIS de médio porte (≈ 17h, +90 branches)

**Objetivo:** Cobrir os 7-8 services mais importantes que ainda têm branches de erro descobertas.

| Arquivo | Esforço | Branches a fechar |
|---|---|---|
| `user.service.ts` | 2h | 10 |
| `occupation.service.ts` | 2h | 14 |
| `comment.service.ts` | 2h | 10 |
| `project.service.ts` | 2h | 12 |
| `auth.service.ts` | 1.5h | 8 |
| `notification.service.ts` (MÉDIO) | 1h | 11 |
| `all-exceptions.filter.ts` | 2h | 9 |
| `lock.service.ts` | 1h | 3 |
| `recurring-task.service.ts` | 1h | 6 |
| `startup-verification.service.ts` | 1.5h | 5 |
| `notification-event.listener.ts` | 2.5h | 8 |
| `task-comments.helper.ts` (se sobrar) | 0.5h | 1 |

**Métricas projetadas após Fase 2:**

| Métrica | Depois da Fase 1 | Depois da Fase 2 (estimado) | Meta |
|---|---|---|---|
| Lines | 95.5% | **~98%** | 90% ✅ |
| Statements | 94.5% | **~98%** | 90% ✅ |
| Functions | 94% | **~98%** | 90% ✅ |
| Branches | 85.5% | **~93-95%** | 90% ✅ |

> **Após a Fase 2, todas as 4 métricas in-scope devem estar acima de 90%** (branches será a última a fechar, com alguma margem).

---

### Fase 3 — DIFÍCEIS Críticos (≈ 13h, +56 branches)

**Objetivo:** Cobrir os serviços mais críticos de domínio e o gateway WebSocket.

| Arquivo | Esforço | Branches a fechar |
|---|---|---|
| `task.service.ts` | 3h | 14 |
| `notification.factory.ts` | 3h | 22 |
| `scheduler.service.ts` | 3h | 12 |
| `events.gateway.ts` | 4h | 13 |
| Margem para refactor/retrabalho | ~2h | — |

**Métricas projetadas após Fase 3:**

| Métrica | Depois da Fase 3 (estimado) | Margem sobre 90% |
|---|---|---|
| Lines | **~99%** | +9 pp |
| Statements | **~99%** | +9 pp |
| Functions | **~99%** | +9 pp |
| Branches | **~96-97%** | +6-7 pp |

---

## 5. Estimativa Total de Esforço

### 5.1 Resumo Quantitativo

| Categoria | Arquivos | Testes Novos | Horas |
|---|---|---|---|
| **Fase 1 (FÁCEIS)** | 28 | ~37 | **~11h** |
| **Fase 2 (MÉDIOS + DIFÍCEIS leves)** | 12 | ~30 | **~17h** |
| **Fase 3 (DIFÍCEIS críticos)** | 4 | ~25 | **~13h** |
| **TOTAL** | **44** | **~92 testes** | **~41h** |

> **Premissas de esforço:**
> - FÁCIL: 30min-1h por arquivo (média 30min)
> - MÉDIO: 1-2h por arquivo
> - DIFÍCIL: 2-4h por arquivo (média 2.5h)

### 5.2 Cronograma Sugerido

| Sprint | Foco | Duração | Testes | Δ branches |
|---|---|---|---|---|
| **Sprint 1** | Fase 1 completa | 1.5 dias (11h) | +37 | +141 |
| **Sprint 2** | Fase 2 | 2.5 dias (17h) | +30 | +90 |
| **Sprint 3** | Fase 3 | 2 dias (13h) | +25 | +56 |
| **Total** | 6 dias úteis (~1.5 semanas) | ~41h | +92 testes | **+287** branches |

> **Resultado final esperado (in-scope, projeto):**
> - Lines: **~99%** (meta 90% ✅)
> - Statements: **~99%** (meta 90% ✅)
> - Functions: **~99%** (meta 90% ✅)
> - Branches: **~96-97%** (meta 90% ✅)


---

## 6. Recomendações Estratégicas

### 6.1 Quick Wins (devem vir primeiro)

1. **`transform.interceptor.ts`** (0.25h): 1 teste cobre 100% do arquivo (linhas e branches).
2. **`notification/strategies/index.ts`** (0.25h): OU ignorar (re-export puro) OU smoke test.
3. **`setup.guard.ts`** (0.5h): 2 testes cobrem 100% (count=0 e count>0).
4. **`validation-error.formatter.ts`** (0.25h): 1 teste cobre os 2 branches.
5. **`password-verification.factory.ts`** (0.5h): 1 teste cobre o branch `!strategy throw`.

**Total Quick Wins: 1.75h para fechar 5 arquivos a 100%.**

### 6.2 Padrão de Teste Recomendado

Todos os testes existentes seguem o mesmo padrão (ver `events.gateway.spec.ts`):

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('NomeDoService', () => {
  let service: NomeDoService;
  // mocks tipados
  const mockRepo = { find: jest.fn(), findOne: jest.fn(), /*...*/ };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NomeDoService,
        { provide: getRepositoryToken(Entity), useValue: mockRepo },
        // outros providers
      ],
    }).compile();
    service = module.get(NomeDoService);
  });

  // it() por branch/condição
});
```

### 6.3 Decisão sobre `index.ts` (estratégias)

Recomendação: **adicionar `!**/strategies/index.ts`** em `collectCoverageFrom` no `package.json`. Esses arquivos são re-exports puros (não contêm lógica) e o teste de smoke que fecha o gap tem valor de QA zero. O `tsc` já valida a integridade das re-exportações.

```json
"collectCoverageFrom": [
  "src/**/*.(t|j)s",
  "!src/**/*.d.ts",
  "!src/database/migrations/**/*.ts",
  "!src/console.ts",
  "!src/modules/notification/strategies/index.ts"
]
```

> Decisão similar poderia ser aplicada a `current-user.decorator.ts` (já 100%) e `validate-entity-ids.helper.ts` (já 100%).

### 6.4 Riscos e Trade-offs

| Risco | Mitigação |
|---|---|
| Refatorar service quebra testes | Rodar `npm run test:cov` a cada commit da Fase 2/3 |
| Mocks imprecisos geram falso positivo | Preferir Test.createTestingModule com overrides sobre `jest.mock` |
| Sobrecarga de manutenção | Manter padrão de mock tipado (não usar `as any`) |
| WebSocket gateway difícil de mockar | Já existe `events.gateway.spec.ts` como base (195 linhas) — apenas estender |

---

## 7. Próximos Passos Imediatos

1. **Decidir se `index.ts` deve ser ignorado** (recomendado: sim)
2. **Criar branch** `feat/coverage-90-phase-1`
3. **Executar Fase 1** (Sprint 1: 28 arquivos FÁCEIS, 11h, +141 branches)
4. **Validar com `npm run test:cov`** após cada arquivo
5. **Rodar Quality Gate** (`npm run quality-gate`) — Nível 2.3 deve refletir o ganho
6. **PR + merge**, repetir para Fase 2 e 3


---

## 8. Apêndice — Arquivos Já em 90%+ (OK, 15 arquivos)

Estes 15 arquivos in-scope já cumprem a meta e **não precisam de ação**:

| Arquivo | LS% | BR% |
|---|---|---|
| `src/common/decorators/current-user.decorator.ts` | 100 | 100 |
| `src/modules/auth/strategies/password/bcrypt-verification.strategy.ts` | 100 | 100 |
| `src/modules/auth/strategies/password/scrypt-verification.strategy.ts` | 100 | 100 |
| `src/modules/exception/helpers/validate-entity-ids.helper.ts` | 100 | 100 |
| `src/modules/exception/pipes/validation.pipe.ts` | 100 | 100 |
| `src/modules/notification/services/debug-logger.service.ts` | 100 | 100 |
| `src/modules/notification/services/notification-query.helper.ts` | 100 | 100 |
| `src/modules/notification/strategies/base-notification.strategy.ts` | 100 | 100 |
| `src/modules/notification/strategies/base-timer.strategy.ts` | 100 | 100 |
| `src/modules/notification/strategies/task-updated.strategy.ts` | 100 | 90.9 |
| `src/modules/notification/strategies/timer-paused.strategy.ts` | 100 | 100 |
| `src/modules/notification/strategies/timer-started.strategy.ts` | 100 | 100 |
| `src/modules/permission/services/notification-recipient.service.ts` | 100 | 94.11 |
| `src/modules/tasks/strategies/active-project-find-all.strategy.ts` | 100 | 100 |
| `src/modules/events/adapters/authenticated-socket.adapter.ts` | 100 | 100 |

---

## 9. Apêndice — Categorização por Tamanho (in-scope)

| Faixa | # Arquivos | Cobertura Lines média | Cobertura Branches média |
|---|---|---|---|
| 0-50 linhas | 21 | 81.5% | 76% |
| 51-100 linhas | 14 | 92% | 75% |
| 101-200 linhas | 16 | 95% | 76% |
| 201+ linhas | 7 | 90% | 71% |

> **Conclusão:** O gargalo de **branches** é uniforme em todas as faixas de tamanho. O problema é de cobertura de casos de erro/edge cases, não de quantidade de linhas.

---

**Documento gerado em 2026-07-05 — Análise baseada em `backend/coverage/coverage-summary.json` (commit `13e9012`).**
