# Nível 2 do Quality Gate — Status & Plano de Ação

Repositório: `https://github.com/ericnunes30/manager-group`  
Branch principal: `main`  
Atualizado em: 2026-06-21

---

## Estado atual do Quality Gate

```text
Nivel 1 - Integridade:   9/10 passam  (1.8 Docker: false positive)
Nivel 2 - Confiabilidade: 5/10 passam  (2.2, 2.4, 2.7, 2.8, 2.9)
```

### Nível 2 — detalhamento

| # | Critério | Status | Detalhe |
|---|---|:---:|---|
| 2.1 | Testes por módulo crítico | ❌ | Sem spec: `auth`, `tasks`, `notification`, `comment`, `project` |
| 2.2 | Suite de testes passa | ✅ | 0 testes passando (passWithNoTests) |
| 2.3 | Cobertura mínima 20% | ❌ | Sem cobertura gerada |
| 2.4 | Sem `any` explícito | ✅ | 0 violações |
| 2.5 | Max 300 linhas/arquivo | ❌ | 2 arquivos acima do limite |
| 2.6 | 3 responsabilidades/classe | ⏸️ | Critério manual |
| 2.7 | Guards consistentes | ✅ | 10/10 `@UseGuards` são `JwtAuthGuard` |
| 2.8 | Migrations ativas | ✅ | `synchronize: false` + `migrationsRun: true` |
| 2.9 | Complexidade < 15/método | ✅ | 0 violações |
| 2.10 | Sem duplicação > 10 linhas | ⏸️ | `jscpd` não instalado |

---

## Arquivos pendentes (2.5)

| Arquivo | Linhas | Ação planejada |
|---|---|---|
| `src/modules/events/gateways/events.gateway.ts` | 509 | Extrair handlers de eventos para `handlers/*.ts` |
| `src/modules/notification/factories/strategies.ts` | 507 | Separar 1 arquivo com 6 classes em 1 arquivo/classe |

> **Módulo `whatsapp` está excluído do critério 2.5 e 2.9** enquanto for uma *integração futura*.
> Ver [modules-status.md](./modules-status.md).

---

## Planos de ação futuros

### Fase 2 — Reduzir arquivos grandes (2.5)

**Objetivo:** zerar as 2 violações restantes de `max-lines`.

1. `events.gateway.ts`
   - Extrair `handleTaskCreatedEvent`, `handleTaskUpdatedEvent`, etc., para arquivos em `events/handlers/`.
   - Manter a classe `EventsGateway` como orquestradora apenas.

2. `notification/factories/strategies.ts`
   - Quebrar em `task-created.strategy.ts`, `task-status-updated.strategy.ts`, `comment-created.strategy.ts`, `timer-started.strategy.ts`, `timer-paused.strategy.ts`, `task-updated.strategy.ts`.
   - Manter `BaseNotificationStrategy` e `NotificationPayload` em um arquivo base.

**Esforço estimado:** 1 dia.

### Fase 3 — Testes unitários (2.1 + 2.3)

**Objetivo:** ter pelo menos 1 `.spec.ts` em cada módulo crítico e atingir 20% de cobertura global.

**Ordem recomendada** (do mais simples ao mais complexo):

1. `auth` (2–3h)
   - Testar `validateUser`, hashing/verificação de senha e `verifyToken`.
   - Usar mocks de repositórios, sem banco real.

2. `comment` (1–2h)
   - Testar CRUD simples.

3. `project` (1–2h)
   - Testar CRUD simples.

4. `notification` (2–3h)
   - Testar estratégias de formatação (mockable).

5. `tasks` (4–6h)
   - Service complexo, raw SQL, decorators — deixar por último.

**Stack:**

- Jest (já configurado)
- `@nestjs/testing` para testes de serviço
- Mocks de repositórios TypeORM (sem PostgreSQL em memória)

**Esforço estimado:** 3–5 dias.

### Fase 4 — Critérios manuais (2.6 + 2.10)

1. **2.6 Responsabilidades por classe**
   - Revisar classes > 200 linhas após a Fase 2.
   - Refatorar para Strategy/Factory quando necessário.

2. **2.10 Sem duplicação de código**
   - Instalar e rodar `jscpd`:
     ```bash
     npm i -D jscpd
     npx jscpd src/ --min-lines 10
     ```
   - Extrair helpers para blocos duplicados > 10 linhas.

**Esforço estimado:** 1 dia.

---

## Decisões já registradas

| Decisão | Registro |
|---|---|
| `auth.controller` fica sem `JwtAuthGuard` | `scripts/quality-gate.ts` + este documento |
| Módulo `whatsapp` é *integração futura* | `.docs/modules-status.md` |
| `migrationsRun: true` ativado | `src/app.module.ts` |
| `JwtAuthGuard` é o guard padrão | 4 controllers atualizados |

---

## Próxima ação sugerida

Iniciar **Fase 2 — 2.5 (max 300 linhas)**, começando por `notification/factories/strategies.ts` (mais mecânico e sem dependências de WebSocket).
