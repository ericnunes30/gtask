# Plano: Cobertura de Testes — Controllers, Strategies e Services sem Spec

> Branch: `feat/zero-coverage-specs`  
> Exclui: WhatsApp (fora de escopo), entities (testadas indiretamente), DTOs (sem lógica), exceptions (triviais)

---

## Wave 1 — Controllers Essenciais (4 specs)

| Arquivo | Prioridade | Motivo |
|---------|-----------|--------|
| `modules/auth/controllers/auth.controller.ts` | Alta | Login, refresh, profile, setup — fluxo crítico |
| `modules/user/controllers/user.controller.ts` | Alta | CRUD de usuários, roles, occupations |
| `modules/task/controllers/task.controller.ts` | Alta | CRUD de tarefas, timer, Kanban |
| `modules/comment/controllers/comment.controller.ts` | Alta | Comentários em tarefas |

**Padrão:** Mock do service + `Test.createTestingModule` + verificar decorators (`@UseGuards`, `@CurrentUser`).

---

## Wave 2 — Controllers Secundários (5 specs)

| Arquivo | Prioridade | Motivo |
|---------|-----------|--------|
| `modules/notification/controllers/notification.controller.ts` | Média | Notificações, markAsRead |
| `modules/project/controllers/project.controller.ts` | Média | CRUD de projetos |
| `modules/role/controllers/role.controller.ts` | Média | Gestão de roles |
| `modules/occupation/controllers/occupation.controller.ts` | Média | Gestão de occupations |
| `modules/recurring-task/controllers/recurring-task.controller.ts` | Baixa | Tarefas recorrentes |

---

## Wave 3 — Auth Strategies (5 arquivos, 1–2 specs)

| Arquivo | Prioridade | Motivo |
|---------|-----------|--------|
| `modules/auth/strategies/jwt.strategy.ts` | Média | Validação de token JWT |
| `modules/auth/strategies/local.strategy.ts` | Média | Validação local (email/senha) |
| `modules/auth/strategies/password/bcrypt-verification.strategy.ts` | Baixa | Estratégia bcrypt |
| `modules/auth/strategies/password/scrypt-verification.strategy.ts` | Baixa | Estratégia scrypt |
| `modules/auth/strategies/password/password-verification.factory.ts` | Baixa | Factory de verificação |

**Padrão:** Mock `ConfigService`, mock `UserService`, mock `bcrypt`/`scrypt`.

---

## Wave 4 — Events / WebSocket / Gateway (4 arquivos)

| Arquivo | Prioridade | Motivo |
|---------|-----------|--------|
| `modules/events/gateways/events.gateway.ts` | Média | Gateway Socket.IO |
| `modules/events/adapters/authenticated-socket.adapter.ts` | Média | Adapter com JWT |
| `modules/events/services/startup-verification/startup-verification.service.ts` | Baixa | Verificação de startup |

**Nota:** `notification-event.listener.ts` é complexo (depende de event-emitter + serverRef). Fica para rodada posterior.

---

## Wave 5 — Services sem Spec (7 arquivos)

| Arquivo | Prioridade | Motivo |
|---------|-----------|--------|
| `modules/activity-log/services/activity-log.service.ts` | Média | Logs de atividade |
| `modules/scheduler/services/lock.service.ts` | Média | Locks distribuídos |
| `modules/scheduler/scheduler.service.ts` | Média | Cron jobs |
| `modules/recurring-task/services/recurring-task.service.ts` | Baixa | Tarefas recorrentes |
| `modules/recurring-task/enhancers/occupation-enhancer.ts` | Baixa | Enhancer de occupations |
| `modules/permission/services/notification-recipient.service.ts` | Baixa | Resolver de recipients |
| `modules/notification/services/debug-logger.service.ts` | Baixa | Logger de debug |
| `modules/notification/services/notification-query.helper.ts` | Baixa | Helper de queries |

**Nota:** `activity-log.listener.ts` também pode ser incluído aqui.

---

## Ordem de Execução

1. Criar branch `feat/zero-coverage-specs`
2. **Paralelo:** Wave 1 (4 specs)
3. **Paralelo:** Wave 2 (5 specs) + Wave 3 (1–2 specs)
4. **Paralelo:** Wave 4 + Wave 5
5. Quality Gate + commit
6. PR

## Estimativa

- Wave 1: ~8 novos testes
- Wave 2: ~10 novos testes
- Wave 3: ~6 novos testes
- Wave 4: ~6 novos testes
- Wave 5: ~10 novos testes
- **Total estimado: +40 testes**
