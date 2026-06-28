# Plano de Prioridades de Testes

## Situação Atual

**112 testes, 14 suites, cobertura geral ~32%**

| Módulo | Lines | Branches | Functions | Tem Spec? |
|---|---|---|---|---|
| TimerService | 97.61% | 77.27% | 100% | ✅ |
| AuthService | 93.33% | 75% | 90.9% | ✅ |
| RoleService | 92.3% | 61.11% | 100% | ✅ |
| NotificationFactory | 90.74% | 62.71% | 92.3% | ✅ |
| OccupationService | 86.76% | 61.11% | 100% | ✅ |
| ExceptionFilter | 86.11% | 67.85% | 100% | ✅ |
| CommentService | 83.58% | 67.64% | 63.63% | ✅ |
| ProjectService | 80.39% | 71.42% | 45.45% | ✅ |
| NotificationService | 52.85% | 45.94% | 40% | ✅ |
| TaskService | 48.35% | 53.22% | 33.33% | ✅ |
| UserService | 47.43% | 45% | 72.72% | ✅ |
| **Controllers (todos)** | **0%** | **0%** | **0%** | ❌ |
| **Events/Gateway** | **0%** | **0%** | **0%** | ❌ |
| **Scheduler** | **0%** | **0%** | **0%** | ❌ |
| **ActivityLog** | **0%** | **0%** | **0%** | ❌ |
| **RecurringTask** | **0%** | **0%** | **0%** | ❌ |
| **Permission** | **0%** | **0%** | **0%** | ❌ |
| **WhatsApp** | **0%** | **0%** | **0%** | ❌ (skip) |

## Critérios de Priorização

1. **Impacto no usuário** — o quanto o bug afeta a experiência
2. **Complexidade lógica** — branches, condicionais, chance de regressão
3. **Esforço vs retorno** — quanto % de cobertura se ganha por teste escrito
4. **Dependência** — módulos que outros dependem vêm primeiro

---

## Prioridade 1 — Fechar gaps nos specs existentes (médio esforço, alto retorno)

### 1A. TaskService (48.35% → ~75%)
**Justificativa**: Módulo mais crítico do sistema (Kanban, timers, assign). Cobertura baixa para a complexidade.

**O que falta** (mapeado do código):
- `create()` — branches de users/occupations/projectId
- `applyUpdate()` — branches de userIds/occupationIds/status
- `assignUsers()` — fluxo completo (já corrigido bug #5)
- `remove()` — fluxo de deleção
- `findAll()` — estratégias diferentes
- `updateTimer()` — validações

**Esforço**: ~40 testes novos | **Ganho**: ~+15% lines

### 1B. UserService (47.43% → ~70%)
**Justificativa**: Base do sistema (auth, roles, occupations). Cobertura baixa.

**O que falta**:
- `create()` — validação de roles/occupations duplicadas
- `update()` — fluxo completo (não só o que existe)
- `findByRole()` — filtro
- `remove()` — fluxo

**Esforço**: ~20 testes novos | **Ganho**: ~+10% lines

### 1C. NotificationService (52.85% → ~80%)
**Justificativa**: Notificações em tempo real. Cobertura mediana.

**O que falta**:
- `markAsRead()` — validação de affected (nova exceção)
- `delete()` — validação de affected (nova exceção)
- `findAll()` — query helper com filtros
- `create()` — fluxo com factory

**Esforço**: ~15 testes novos | **Ganho**: ~+5% lines

---

## Prioridade 2 — Controllers (médio esforço, médio retorno)

### 2A. AuthController
**Justificativa**: Login/register/setup — porta de entrada do sistema. 0% coverage.

**O que testar**:
- `login()` — sucesso, credenciais inválidas
- `register()` — sucesso, duplicidade
- `setup()` — primeiro acesso
- `refreshToken()` — token válido/expirado

**Esforço**: ~15 testes | **Ganho**: ~+3% lines

### 2B. TaskController
**Justificativa**: Endpoints mais usados no frontend. 0% coverage.

**O que testar**:
- `findAll()` — com/sem filtros
- `findOne()` — sucesso, 404
- `create()` — validação de DTO
- `update()` / `patch()` — fluxos
- `assignUsers()` — endpoint
- `updateTimer()` — endpoint

**Esforço**: ~20 testes | **Ganho**: ~+3% lines

### 2C. Demais controllers (User, Role, Occupation, Project, Comment, Notification)
**Esforço**: ~10 testes cada | **Ganho**: ~+2% lines cada

---

## Prioridade 3 — Módulos sem spec (alto esforço, médio retorno)

### 3A. Events/Gateway (WebSocket)
**Justificativa**: Tempo real — timers, notificações, atualizações. 0% coverage.

**O que testar**:
- `handleConnection()` — autenticação via token
- `handleDisconnect()` — limpeza
- `joinTaskRoom()` / `leaveTaskRoom()` — salas
- `handleTimerUpdate()` — broadcast
- `handleTaskUpdate()` — broadcast

**Esforço**: ~25 testes | **Ganho**: ~+5% lines

### 3B. SchedulerService
**Justificativa**: Jobs em background (task-locks, limpeza). 0% coverage.

**O que testar**:
- `processRecurringTasks()` — criação de tasks recorrentes
- `cleanupExpiredLocks()` — remoção
- `handleTimeout()` — timeout de timer

**Esforço**: ~15 testes | **Ganho**: ~+3% lines

### 3C. ActivityLogService + Listener
**Justificativa**: Audit trail. 0% coverage.

**O que testar**:
- `log()` — criação de log
- Listener — reação a eventos
- Filtros por entidade/tipo

**Esforço**: ~10 testes | **Ganho**: ~+2% lines

### 3D. RecurringTaskService
**Justificativa**: Tasks recorrentes. 0% coverage.

**O que testar**:
- `create()` — validação de regras de recorrência
- `generateNextOccurrences()` — cálculo de datas
- `update()` / `remove()`

**Esforço**: ~15 testes | **Ganho**: ~+2% lines

---

## Prioridade 4 — Branches e Edge Cases (baixo esforço, alto retorno)

### 4A. ExceptionFilter — branches não cobertos (67.85%)
- QueryFailedError (duplicidade unique)
- EntityNotFoundError
- Erro genérico não mapeado

### 4B. NotificationFactory — branches (62.71%)
- Estratégias não registradas
- Payload inválido por strategy

### 4C. RoleService — branches (61.11%)
- Nome duplicado no update (já tem teste)
- Nome duplicado no create

### 4D. OccupationService — branches (61.11%)
- Nome duplicado no update
- Nome duplicado no create
- UserNotInOccupation

---

## Resumo de Esforço

| Prioridade | Módulos | Testes Novos | Ganho Lines | Ganho Branches |
|---|---|---|---|---|
| P1 | Task, User, Notification | ~75 | ~+30% | ~+20% |
| P2 | Controllers (7) | ~75 | ~+15% | ~+15% |
| P3 | Events, Scheduler, ActivityLog, Recurring | ~65 | ~+12% | ~+10% |
| P4 | Branches (Exception, Factory, Role, Occupation) | ~20 | ~+5% | ~+10% |
| **Total** | | **~235** | **~62%** | **~55%** |

## Recomendação

1. **Fazer P1 agora** — Task, User, Notification são os specs existentes com menor cobertura. É onde cada teste novo dá mais retorno.
2. **P4 junto com P1** — branches são testes pequenos que fecham lacunas.
3. **P2 depois** — controllers são importantes mas cada teste cobre pouco (muita configuração de mock para pouco código).
4. **P3 por último** — módulos sem spec exigem criar do zero, maior esforço de setup.

> **WhatsApp**: mantido em 0% conforme decisão. Não incluir em nenhuma rodada.
