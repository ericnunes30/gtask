# Plano de Simplificacao de Design Patterns — Backend

Data: 2026-06-21
Escopo: remover/simplificar padrões de design desnecessários mapeados em `design-patterns-audit.md`.
Princípio: **YAGNI** — só manter abstrações quando houver variação real sendo usada.

---

## Critérios gerais

- Cada fase deve passar em:
  1. `npm run lint` (zero erros/warnings)
  2. `npx tsc --noEmit` (zero erros)
  3. `npx prettier --check` (formatado)
  4. `npm run quality-gate` (sem regredir verdes atuais)
- Não usar `any` em nenhuma alteração.
- Não alterar comportamento funcional (timer, drag-and-drop, duplicar tarefa, login, etc.).
- Criar um commit por fase, com mensagem descritiva.
- Ao final de cada fase, apresentar tabela com Δ de linhas e status do quality gate.

---

## Fase 1 — `auth`: remover factories desnecessárias (BAIXO RISCO)

### Objetivo
Remover abstrações mortas ou com uma única implementação, mantendo apenas `PasswordVerificationFactory` (única com variação real).

### Mudanças
1. **Remover `TokenPayloadFactory`**
   - Deletar: `backend/src/modules/auth/factories/token-payload.factory.ts`
   - Criar helper privado em `AuthService`: `buildTokenPayload(user, includeRoles)`.
   - Atualizar `AuthService` para usar o helper.

2. **Remover `AuthResponseFactory` e strategies**
   - Deletar: `backend/src/modules/auth/factories/auth-response.factory.ts`
   - Remover injeção de `AuthResponseFactory` de `AuthService`.

3. **Remover `UserValidationFactory` e strategy**
   - Deletar: `backend/src/modules/auth/factories/user-validation.factory.ts`
   - Mover lógica de `StandardUserValidationStrategy.validateUser` para método privado em `AuthService`.

### Arquivos afetados
- `backend/src/modules/auth/factories/*.ts`
- `backend/src/modules/auth/services/auth.service.ts`
- `backend/src/modules/auth/auth.module.ts` (providers)

### Commit sugerido
```text
refactor(auth): remove factories desnecessarias e simplifica validacao

- Remove TokenPayloadFactory (sempre usado context='extended');
  vira helper buildTokenPayload no AuthService.
- Remove AuthResponseFactory (codigo morto, nao era chamado).
- Remove UserValidationFactory (apenas 1 strategy canHandle=true);
  logica de validacao vira metodo privado do AuthService.
- Mantem PasswordVerificationFactory (bcrypt/scrypt = variacao real).
```

---

## Fase 2 — `recurring-task`: remover factories e simplificar enhancer (BAIXO RISCO)

### Objetivo
Eliminar factories com uma única implementação e tornar `OccupationEnhancer` um helper concreto.

### Mudanças
1. **Remover `RecurringTaskCreationFactory`**
   - Deletar: `backend/src/modules/recurring-task/factories/recurring-task-creation.factory.ts`
   - Mover defaults (`next_due_date ?? new Date()`, `is_active ?? true`) para `RecurringTaskService.create`.

2. **Remover `RecurringTaskUpdateFactory`**
   - Deletar: `backend/src/modules/recurring-task/factories/recurring-task-update.factory.ts`
   - Mover lógica de update para `RecurringTaskService.update`.

3. **Simplificar `OccupationEnhancer`**
   - Deletar interface `RecurringTaskEnhancer` (se existir).
   - Transformar `OccupationEnhancer` em helper/método privado no service.
   - Se ainda for útil como classe injetável, mantê-la sem a interface fantasmas.

### Arquivos afetados
- `backend/src/modules/recurring-task/factories/*.ts`
- `backend/src/modules/recurring-task/enhancers/*.ts`
- `backend/src/modules/recurring-task/services/recurring-task.service.ts`
- `backend/src/modules/recurring-task/recurring-task.module.ts`

### Commit sugerido
```text
refactor(recurring-task): remove factories e simplifica enhancer

- Remove RecurringTaskCreationFactory e RecurringTaskUpdateFactory
  (apenas 1 strategy cada; logica movida para service).
- Simplifica OccupationEnhancer removendo interface vazia;
  vira helper no service.
```

---

## Fase 3 — `tasks`: remover strategy/factory e simplificar eventos (MÉDIO RISCO)

### Objetivo
Eliminar `TaskStrategyFactory`, `TaskCreationFactory` e reduzir a verbosidade dos notificadores de eventos.

### Mudanças
1. **Remover `TaskStrategyFactory` e strategies não utilizadas**
   - Deletar: `backend/src/modules/tasks/strategies/task-strategy.factory.ts`
   - Deletar strategies mortas: `RepositoryUpdateStrategy`, `EntityTimerUpdateStrategy`, `StandardFindAllStrategy` (se não forem usadas).
   - Manter apenas `TaskOperationStrategy` se ainda for usada como contrato real.
   - Mover lógica de `ActiveProjectFindAllStrategy`, `EntityUpdateStrategy` e `RepositoryTimerUpdateStrategy` para métodos privados de `TaskService`.

2. **Remover `TaskCreationFactory`**
   - Deletar: `backend/src/modules/tasks/factories/task-creation.factory.ts`
   - Mover lógica (`timer ?? 0`, separação de relações) para `TaskService.create`.

3. **Simplificar emissão de eventos**
   - Remover classes abstratas `TaskCreator` e `TaskUpdater`.
   - Remover decorators `TaskCreationNotifierDecorator` e `TaskUpdateNotifierDecorator`.
   - Emitir eventos diretamente no `TaskService` após `save()` / `update()`.
   - Atualizar `TaskController` para chamar `TaskService` diretamente (sem decorator wrapper).

### Arquivos afetados
- `backend/src/modules/tasks/strategies/*.ts`
- `backend/src/modules/tasks/factories/*.ts`
- `backend/src/modules/tasks/decorators/*.ts`
- `backend/src/modules/tasks/services/task.service.ts`
- `backend/src/modules/tasks/services/task-creator.abstract.ts`
- `backend/src/modules/tasks/services/task-updater.abstract.ts`
- `backend/src/modules/tasks/controllers/task.controller.ts`
- `backend/src/modules/tasks/tasks.module.ts`

### Atenção especial
- O timer e o drag-and-drop (atualização de status) passam pelo `TaskService`. Validar manualmente após a refatoração.
- A emissão de eventos é consumida por `activity-log`, `notification` e WebSocket. Garantir que os mesmos eventos (`task.created`, `task.status.updated`, `task.updated`) continuem sendo emitidos.

### Commit sugerido
```text
refactor(tasks): remove strategy/factory desnecessarias e simplifica eventos

- Remove TaskCreationFactory (1 strategy; logica movida para service).
- Remove TaskStrategyFactory e strategies fantasmas.
- Remove decorators/classes abstratas de notificacao;
  eventos agora emitidos diretamente no TaskService.
- TaskController chama TaskService diretamente.
```

---

## Fase 4 — `comment`: simplificar emissão de eventos (MÉDIO RISCO)

### Objetivo
Remover `CommentCreationDecorator` e `CommentCreator` abstract; emitir `comment.created` diretamente no `CommentService`.

### Mudanças
1. **Remover decorator e classe abstrata**
   - Deletar: `backend/src/modules/comment/decorators/comment-creation.decorator.ts`
   - Deletar `CommentCreator` abstract (se existir como arquivo separado).

2. **Emitir evento no service**
   - Adicionar `this.eventEmitter.emit('comment.created', { ... })` no método `create` de `CommentService`.

3. **Atualizar controller**
   - `CommentController` chama `CommentService.create` diretamente.

### Arquivos afetados
- `backend/src/modules/comment/decorators/*.ts`
- `backend/src/modules/comment/services/comment.service.ts`
- `backend/src/modules/comment/controllers/comment.controller.ts`
- `backend/src/modules/comment/comment.module.ts`

### Commit sugerido
```text
refactor(comment): emite evento comment.created diretamente no service

- Remove CommentCreationDecorator e CommentCreator abstract.
- Emite evento no CommentService.create apos persistencia.
- Controller chama service diretamente.
```

---

## Fase 5 — Validação final e ajustes

### Checklist
- [ ] `npm run lint` passa
- [ ] `npx tsc --noEmit` passa
- [ ] `npx prettier --check` passa
- [ ] `npm run quality-gate` não regrediu
- [ ] `npm run migration:run` executa sem erros
- [ ] `npm run build` + `node dist/main.js` sobe a aplicação
- [ ] Testes manuais: login, criar tarefa, mover tarefa (drag/drop), iniciar/pausar timer, criar comentário, duplicar tarefa

### Commit sugerido (se houver ajustes menores)
```text
chore(backend): ajustes finais apos simplificacao de patterns

- Corrige providers e imports removidos.
- Garante quality gate sem regressao.
```

---

## Estratégia de branch/PR

Recomenda-se fazer todo o trabalho na branch atual `feat/database-baseline`, já que ela está aberta no PR #93 e ainda não foi mergeada.

Alternativa (mais limpa): criar uma nova branch `refactor/simplify-design-patterns` a partir de `feat/database-baseline` e abrir PR separado. Isso isola a revisão da baseline da revisão da simplificação.

**Recomendação do autor deste plano:** criar branch separada `refactor/simplify-design-patterns` para não misturar a baseline (já validada) com a refatoração de código funcional.

---

## Ordem recomendada de execução

1. Fase 1 (`auth`) — baixo risco, código morto claro.
2. Fase 2 (`recurring-task`) — baixo risco, CRUD simples.
3. Fase 3 (`tasks`) — médio risco, validar timer e eventos.
4. Fase 4 (`comment`) — médio risco, validar eventos WebSocket/activity-log.
5. Fase 5 — validação final.

---

## Riscos identificados

| Risco | Mitigação |
|---|---|
| Eventos não emitidos após remover decorators | Revisar todos os `@OnEvent('task.created')` etc. e garantir que `TaskService`/`CommentService` emitam os mesmos eventos. |
| Dependências circulares ao simplificar `tasks` | Verificar `forwardRef` entre `TaskModule` e `EventsModule`. |
| Quebra de autenticação ao remover factories de `auth` | Validar login/register/token refresh após cada alteração. |
| Regressão no quality gate | Rodar `quality-gate` após cada fase; não avançar se houver regressão. |

---

## Próxima ação dependente do usuário

Aguardar aprovação deste plano antes de iniciar a execução.

Decisões pendentes:
1. **Executar na branch atual `feat/database-baseline` ou criar `refactor/simplify-design-patterns` separada?**
2. **Incluir também a simplificação do `OccupationEnhancer` como helper no service, ou manter como classe injetável sem interface?**
3. **Deseja testar endpoints manualmente a cada fase, ou apenas no final?**
