# Auditoria de Design Patterns — Backend

Data: 2026-06-21
Branch: `feat/database-baseline`
Escopo: mapear os padrões de design atualmente implementados em `backend/src/modules` e avaliar se cada um tem **necessidade real** no estado atual do projeto.

Legenda:
- 🟢 **MANTER**: resolve variação real de comportamento.
- 🟡 **SIMPLIFICAR**: propósito é válido, mas a implementação está verbosa ou over-engineered.
- 🔴 **REMOVER**: não resolve variação real hoje; complica o código sem benefício.

---

## `auth`

| Padrão | Arquivo(s) | Avaliação |
|---|---|---|
| PasswordVerificationFactory + strategies (bcrypt/scrypt) | `auth/strategies/password/*.ts` | 🟢 **MANTER**. Único caso real de variação: o projeto parece suportar hashes legados (scrypt) e novos (bcrypt). |
| TokenPayloadFactory (Default/Extended) | `auth/factories/token-payload.factory.ts` | 🔴 **REMOVER**. O `AuthService` sempre chama `context='extended'`. A diferença é apenas incluir ou não `roles`. Pode virar um helper único `buildTokenPayload(user, includeRoles)`. |
| AuthResponseFactory (Login/Detailed) | `auth/factories/auth-response.factory.ts` | 🔴 **REMOVER**. A factory está injetada, mas `createLoginResponse` **não é chamado** em lugar nenhum. Código morto. |
| UserValidationFactory (1 strategy: Standard) | `auth/factories/user-validation.factory.ts` | 🔴 **REMOVER**. Só existe uma implementação; o `canHandle` sempre retorna `true`. A lógica pode morar diretamente em `AuthService.validateUser`. |
| Passport strategies (Jwt/Local) | `auth/strategies/*.strategy.ts` | 🟢 **MANTER**. Obrigatório pela integração NestJS + Passport. |

**Parecer:** três das quatro factories de `auth` não têm justificativa real hoje. A única que vale a pena é a de verificação de senha.

---

## `tasks`

| Padrão | Arquivo(s) | Avaliação |
|---|---|---|
| TaskStrategyFactory | `tasks/strategies/task-strategy.factory.ts` | 🔴 **REMOVER**.<br>- Update: só instancia `EntityUpdateStrategy`; `RepositoryUpdateStrategy` existe mas nunca é usada.<br>- Timer: `RepositoryTimerUpdateStrategy` sempre ganha; `EntityTimerUpdateStrategy` nunca é usada.<br>- FindAll: `ActiveProjectFindAllStrategy` é a única registrada; `StandardFindAllStrategy` existe no arquivo mas não é instanciada.<br>Não há variação real, só indireção. |
| TaskCreationFactory (1 strategy: Default) | `tasks/factories/task-creation.factory.ts` | 🔴 **REMOVER**. `DefaultTaskCreationStrategy` só separa relações e aplica `timer ?? 0`. O `TaskService` já faz o trabalho pesado de buscar users/occupations depois do `save`. |
| TaskUpdateNotifier / TaskCreationNotifier decorators | `tasks/decorators/*.decorator.ts` | 🟡 **SIMPLIFICAR**. Emitem eventos consumidos por `activity-log` e `events.gateway`, então o propósito é válido. Porém, a combinação de classes abstratas (`TaskCreator`/`TaskUpdater`) + decoradores + injeção no controller é verbosa demais para “emitir evento após ação”. Pode virar emissão direta no service ou um helper menor. |

**Parecer:** o módulo `tasks` sofre do mal da “preparação para futura extensão”. Nenhuma das strategies/factories tem mais de uma implementação ativa. Recomenda-se remover e deixar o service mais direto.

---

## `comment`

| Padrão | Arquivo(s) | Avaliação |
|---|---|---|
| CommentCreationDecorator | `comment/decorators/comment-creation.decorator.ts` | 🟡 **SIMPLIFICAR**. Emite `comment.created`, usado por `activity-log` e WebSocket. Propósito ok, mas criar classe abstrata `CommentCreator` + implementação `CommentService` + decorator só para isso é overkill. A emissão do evento pode ficar diretamente no `CommentService.create`. |

**Parecer:** manter a funcionalidade (emitir evento), mas sem a arquitetura de decorator/abstract class.

---

## `recurring-task`

| Padrão | Arquivo(s) | Avaliação |
|---|---|---|
| RecurringTaskCreationFactory (1 strategy) | `recurring-task/factories/recurring-task-creation.factory.ts` | 🔴 **REMOVER**. Só faz `Object.assign` com defaults (`next_due_date ?? new Date()`, `is_active ?? true`). Pode ser movido para o service. |
| RecurringTaskUpdateFactory (1 strategy) | `recurring-task/factories/recurring-task-update.factory.ts` | 🔴 **REMOVER**. Apenas atualiza campos do DTO na entidade. Lógica simples de update que pode morar no service. |
| OccupationEnhancer | `recurring-task/enhancers/occupation-enhancer.ts` | 🟡 **SIMPLIFICAR**. Popula occupations a partir de IDs em `findAll`/`findOne`/`create`. Hoje existe apenas esse enhancer, então a interface `RecurringTaskEnhancer` é desnecessária. Pode virar método privado/helper no service; se no futuro surgirem múltiplos enhancers, aí se extrai a interface. |

**Parecer:** módulo pequeno com três abstrações para resolver um CRUD simples. Recomenda-se reduzir ao essencial.

---

## `notification`

| Padrão | Arquivo(s) | Avaliação |
|---|---|---|
| NotificationFactory + BaseNotificationStrategy | `notification/factories/notification.factory.ts`<br>`notification/factories/strategies.ts` | 🟢 **MANTER**. Este é o uso mais justificado: 6 tipos de evento (`task.created`, `task.status.updated`, `comment.created`, `task.updated`, `timer.started`, `timer.paused`) geram notificações com shape, prioridade e validação diferentes. O registry por `type` evita um `switch` gigante no service. |

**Parecer:** manter. Recomendação menor: separar a validação genérica `validateNotification` da factory, pois ela mistura regras de domínio com o registry de strategies.

---

## `whatsapp`

| Padrão | Arquivo(s) | Avaliação |
|---|---|---|
| MessageFormatterFactory | `whatsapp/factories/message-formatter.factory.ts` | 🟢 **MANTER**. Apesar do nome “factory” na pasta, na prática é um helper que mapeia `NotificationType` para template de mensagem. É direto, sem strategies fantasmas, e faz sentido para o módulo. |

**Parecer:** manter como está. O nome da pasta pode gerar confusão (“factory”), mas o código é simples.

---

## Outros padrões consolidados (não candidatos à remoção)

| Padrão | Onde aparece | Parecer |
|---|---|---|
| Repository (TypeORM) | Todos os services que injetam `Repository<Entity>` | 🟢 Essencial. Padrão do ORM. |
| DTOs | `auth/dto`, `tasks/dto`, `user/dto`, etc. | 🟢 Essencial. Validação e tipagem de entrada. |
| Module (NestJS) | `*.module.ts` de cada domínio | 🟢 Obrigatório na arquitetura NestJS. |
| Guard / Interceptor / Filter | `common/guards`, `common/interceptors`, `common/filters` | 🟢 Pipeline do NestJS bem aplicado. |
| Observer / Event-driven | `EventEmitter2`, `@OnEvent` listeners | 🟢 Mantido, mas considerar se a emissão de eventos poderia ser mais centralizada (evita decorators over-engineered). |
| Adapter | `AuthenticatedSocketAdapter` | 🟢 Justificado: autentica JWT no handshake do Socket.IO. |
| Facade | `AuthService`, `PermissionService` | 🟢 Coordenam múltiplas dependências. |
| Command (CLI) | `FindTestDataCommand` | 🟢 Mantido; útil para testes manuais. |

---

## Resumo executivo

- **Padrões que realmente resolvem variação genuína**: `PasswordVerificationFactory` (bcrypt/scrypt) e `NotificationFactory` (6 tipos de notificação).
- **Padrões que complicam sem necessidade atual**: a maioria das factories/strategies de `auth`, `tasks` e `recurring-task`. São abstrações com uma única implementação ou sem chamadores reais.
- **Padrões com propósito válido mas implementação verbosa**: notificadores de `tasks` e `comment`. A funcionalidade (emitir eventos) deve ser mantida, mas a arquitetura pode ser simplificada.

**Recomendação geral:** não continuar adicionando abstrações “para quando precisar no futuro”. Aplicar YAGNI: refatorar para padrões apenas quando houver **duas ou mais variações concretas** sendo usadas.

---

## Próximos passos sugeridos

1. Remover factories mortas de `auth` (`AuthResponseFactory`, `UserValidationFactory`, `TokenPayloadFactory`).
2. Simplificar `auth` deixando apenas `PasswordVerificationFactory` e helpers simples.
3. Remover `TaskCreationFactory` e `TaskStrategyFactory`; mover lógica para `TaskService`.
4. Simplificar emissão de eventos em `tasks` e `comment` (remover decorators/classes abstratas).
5. Remover factories de `recurring-task` e simplificar `OccupationEnhancer`.
6. Manter `NotificationFactory` e `MessageFormatterFactory`.
7. Executar quality-gate após cada rodada de simplificação.
