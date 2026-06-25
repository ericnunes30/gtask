# Plano de implementação: módulo de exceções do backend

> Projeto: `manager-group`  
> Branch: `feat/backend-unit-tests`  
> Escopo: pesquisa e planejamento — **nenhuma alteração de código** foi feita nesta etapa.

---

## 1. Filtro atual e o que migrar/remover

Arquivo analisado: `backend/src/common/filters/http-exception.filter.ts`

O arquivo contém dois filtros:

| Filtro | Comportamento | Ação recomendada |
|---|---|---|
| `HttpExceptionFilter` | Captura apenas `HttpException` e devolve `{ success, statusCode, timestamp, path, message }` | **Remover**. É duplicado pelo `AllExceptionsFilter`, que também trata `HttpException`. |
| `AllExceptionsFilter` | Captura qualquer exceção (`@Catch()`), loga no console, envia erros `>= 500` para Sentry e devolve o mesmo shape JSON padronizado | **Migrar** para dentro do futuro `ExceptionModule` (p. ex. `backend/src/common/exception/` ou `backend/src/modules/exception/`). Exportar como `APP_FILTER` global ou mantê-lo como provider exportado. |

### O que deve ser migrado

- Lógica centralizada de formatação de resposta de erro (`success: false`, `statusCode`, `timestamp`, `path`, `message`).
- Integração com Sentry (somente erros `>= 500`, com escopo de método/path/headers/user id).
- O fallback para `HttpStatus.INTERNAL_SERVER_ERROR` quando a exceção não for `HttpException`.
- O arquivo `backend/src/common/filters/http-exception.filter.ts` pode ser excluído após a migração.

### O que pode ser melhorado no filtro global

- Evitar `console.error` direto: usar `Logger` do NestJS.
- Separar responsabilidade de log em arquivo (hoje feito no `ValidationPipe`) para um serviço de log chamado pelo filtro ou por um interceptor.

---

## 2. Alterações necessárias em `backend/src/main.ts`

Arquivo analisado: `backend/src/main.ts`

### 2.1 `AllExceptionsFilter`

- **Local atual:** linha 11 (`import { AllExceptionsFilter } ...`) e linha 54 (`app.useGlobalFilters(new AllExceptionsFilter());`).
- **Alteração:** remover o `import` e o `useGlobalFilters` direto. O filtro deve ser registrado automaticamente pelo `ExceptionModule` via provider `{ provide: APP_FILTER, useClass: AllExceptionsFilter }`.

### 2.2 `ValidationPipe`

- **Local:** linhas 32-49.
- **Ajustes:**
  - Remover `fs.appendFileSync` (linha 44) e o `import * as fs from 'fs'` (linha 13).
  - O log de validação deve ir para um serviço de log ou ser capturado pelo filtro global; manter apenas `return new BadRequestException(errors)` no `exceptionFactory`.
  - Manter `whitelist`, `forbidNonWhitelisted`, `transform`, `errorHttpStatusCode: HttpStatus.BAD_REQUEST` e `validationError: { target: false, value: false }`.

### 2.3 Imports a remover/adicionar

- Remover:
  - `import { AllExceptionsFilter } from './common/filters/http-exception.filter';`
  - `import * as fs from 'fs';`
- Adicionar:
  - `import { ExceptionModule } from './common/exception/exception.module';` (ou caminho escolhido) e incluí-lo na raiz, ou simplesmente importá-lo em `AppModule`.

### 2.4 Registro do `ExceptionModule`

Sugestão: importar `ExceptionModule` em `AppModule` (caso queira módulo comum) ou em `main.ts` via `app.useGlobalFilters`. A forma idiomática no NestJS é:

```ts
// app.module.ts
@Module({
  imports: [
    // ...
    ExceptionModule,
  ],
})
```

Com isso, `main.ts` fica enxuto: só inicializa Sentry, adapter, CORS, prefixo, `ValidationPipe`, `TransformInterceptor` e listen.

---

## 3. Controllers que usam `+id` em vez de `ParseIntPipe`

Foram analisados os controllers solicitados. A tabela abaixo lista os métodos, as linhas atuais e a alteração para `ParseIntPipe`.

### 3.1 `backend/src/modules/project/controllers/project.controller.ts`

| Método | Linha do `@Param('id')` | Linha do `+id` | Ação |
|---|---|---|---|
| `findOne` | 32 | 33 | Adicionar `ParseIntPipe` no decorator |
| `update` | 37 | 38 | Adicionar `ParseIntPipe` no decorator |
| `remove` | 42 | 43 | Adicionar `ParseIntPipe` no decorator |
| `findProjectTasks` | 47 | 48 | Adicionar `ParseIntPipe` no decorator |

### 3.2 `backend/src/modules/tasks/controllers/task.controller.ts`

| Método | Linha do `@Param('id')` | Linha(s) do `+id` | Ação |
|---|---|---|---|
| `findAll` (query `project`) | 41 | `+projectId` em 42 | Adicionar `ParseIntPipe` para query string ou tratar no service |
| `findOne` | 50 | 51 | Adicionar `ParseIntPipe` no decorator |
| `update` | 56 | 60 | Adicionar `ParseIntPipe` no decorator |
| `patch` | 65 | 75 | Adicionar `ParseIntPipe`; o `+id` interno do `try/catch` também desaparece |
| `remove` | 90 | 91 | Adicionar `ParseIntPipe` no decorator |
| `updateTimer` | 95 | 96 | Adicionar `ParseIntPipe` no decorator |
| `assignUsers` | 100 | 101 | Adicionar `ParseIntPipe` no decorator |

### 3.3 `backend/src/modules/occupation/controllers/occupation.controller.ts`

| Método | Linha do `@Param('id')` | Linha do `+id` | Ação |
|---|---|---|---|
| `findOne` | 33 | 34 | Adicionar `ParseIntPipe` no decorator |
| `update` | 39 | 42 | Adicionar `ParseIntPipe` no decorator |
| `remove` | 46 | 47 | Adicionar `ParseIntPipe` no decorator |
| Nota: `addUserToOccupation` e `removeUserFromOccupation` já usam `ParseIntPipe`. | | | |

### 3.4 `backend/src/modules/role/controllers/role.controller.ts`

| Método | Linha do `@Param('id')` | Linha do `+id` | Ação |
|---|---|---|---|
| `findOne` | 32 | 33 | Adicionar `ParseIntPipe` no decorator |
| `update` | 37 | 38 | Adicionar `ParseIntPipe` no decorator |
| `remove` | 42 | 43 | Adicionar `ParseIntPipe` no decorator |

### 3.5 `backend/src/modules/notification/controllers/notification.controller.ts`

Esse controller não usa `+id`, mas declara `@Param('id') id: number` sem `ParseIntPipe`. Isso causa transformação implícita e pode receber `string`. Deve ser ajustado.

| Método | Linha do `@Param('id')` | Ação |
|---|---|---|
| `getNotificationById` | 70 | Adicionar `ParseIntPipe` (`@Param('id', ParseIntPipe) id: number`) |
| `markAsRead` | 84 | Adicionar `ParseIntPipe` |
| `deleteNotification` | 113 | Adicionar `ParseIntPipe` |

### Observação extra

- `backend/src/modules/recurring-task/controllers/recurring-task.controller.ts` também usa `+id` (`findOne`, `update`, `remove`). Não faz parte da lista solicitada, mas deve ser incluído na mesma refatoração para padronização.

---

## 4. `throw new Error(...)` que devem virar `HttpException`

Foram listados **apenas arquivos de produção** (`.spec.ts` foram ignorados, pois muitos mocks lançam `Error` de propósito).

### Notificação (`modules/notification`)

| Arquivo | Linha | `throw new Error` atual | Exceção sugerida | Status HTTP |
|---|---|---|---|---|
| `controllers/notification.controller.ts` | 76 | `Notification not found` | `NotificationNotFoundException` | 404 |
| `factories/notification.factory.ts` | 27 | `No strategy found for event type: ${eventType}` | `NotificationStrategyNotFoundException` (ou `InternalServerErrorException`) | 500 |
| `factories/notification.factory.ts` | 31 | `Invalid payload for event type: ${eventType}` | `InvalidNotificationDataException` | 400 |
| `services/notification.service.ts` | 30 | `Invalid notification data` | `InvalidNotificationDataException` | 400 |
| `entities/notification.entity.ts` | 75 | `Invalid notification data for notification ${this.id}` | `InvalidNotificationDataException` | 400 / 500 |
| `entities/notification.entity.ts` | 79 | `Invalid notification metadata for notification ${this.id}` | `InvalidNotificationDataException` | 400 / 500 |
| `strategies/comment-created.strategy.ts` | 35 | `Invalid payload for CommentCreatedStrategy` | `InvalidNotificationDataException` | 400 |
| `strategies/task-created.strategy.ts` | 33 | `Invalid payload for TaskCreatedStrategy` | `InvalidNotificationDataException` | 400 |
| `strategies/task-status-updated.strategy.ts` | 33 | `Invalid payload for TaskStatusUpdatedStrategy` | `InvalidNotificationDataException` | 400 |
| `strategies/task-updated.strategy.ts` | 36 | `Invalid payload for TaskUpdatedStrategy` | `InvalidNotificationDataException` | 400 |
| `strategies/timer-paused.strategy.ts` | 28 | `Invalid payload for TimerPausedStrategy` | `InvalidNotificationDataException` | 400 |
| `strategies/timer-started.strategy.ts` | 28 | `Invalid payload for TimerStartedStrategy` | `InvalidNotificationDataException` | 400 |

### Outros módulos

| Arquivo | Linha | `throw new Error` atual | Exceção sugerida | Status HTTP |
|---|---|---|---|---|
| `auth/strategies/password/password-verification.factory.ts` | 21 | `No password verification strategy found for hash: ...` | `InternalServerErrorException` | 500 |
| `events/services/startup-verification/startup-verification.service.ts` | 42 | `Required service ${name} is not available` | `InternalServerErrorException` | 500 |

---

## 5. Exceções de domínio por módulo

Todas devem ser criadas em `modules/<modulo>/exceptions/` e, quando possível, estender as exceções nativas do NestJS (`NotFoundException`, `BadRequestException`, `ConflictException`).

### 5.1 `modules/user/exceptions/`

| Exceção | Motivo | Extende | HTTP |
|---|---|---|---|
| `UserNotFoundException` | `findOne`, `update`, `remove`, `assignRoles`, `assignOccupations` quando usuário não existe | `NotFoundException` | 404 |

### 5.2 `modules/role/exceptions/`

| Exceção | Motivo | Extende | HTTP |
|---|---|---|---|
| `RoleNotFoundException` | `findOne`, `update`, `remove` quando role não existe | `NotFoundException` | 404 |
| `DuplicateRoleNameException` | `create`/`update` quando já existe role com mesmo nome | `ConflictException` | 409 |

### 5.3 `modules/occupation/exceptions/`

| Exceção | Motivo | Extende | HTTP |
|---|---|---|---|
| `OccupationNotFoundException` | `findOne`, `update`, `remove`, `addUserToOccupation`, `removeUserFromOccupation` | `NotFoundException` | 404 |
| `DuplicateOccupationNameException` | `create`/`update` quando já existe occupation com mesmo nome | `ConflictException` | 409 |

### 5.4 `modules/project/exceptions/`

| Exceção | Motivo | Extende | HTTP |
|---|---|---|---|
| `ProjectNotFoundException` | `findOne`, `update`, `remove`, `findProjectTasks` | `NotFoundException` | 404 |
| `RelatedUsersNotFoundException` | IDs de usuários passados em `create`/`update` não encontrados | `BadRequestException` | 400 |
| `RelatedTeamsNotFoundException` | IDs de occupations/equipes passados em `create`/`update` não encontrados | `BadRequestException` | 400 |

### 5.5 `modules/tasks/exceptions/`

| Exceção | Motivo | Extende | HTTP |
|---|---|---|---|
| `TaskNotFoundException` | `findOne`, `update`, `remove`, `assignUsers`, `updateTimer` | `NotFoundException` | 404 |
| `RelatedUsersNotFoundException` | IDs de usuários passados em `create`/`update` não encontrados | `BadRequestException` | 400 |
| `RelatedOccupationsNotFoundException` | IDs de occupations passados em `create`/`update` não encontrados | `BadRequestException` | 400 |
| `InvalidTimerValueException` | `updateTimer` com valor negativo ou inválido | `BadRequestException` | 400 |

### 5.6 `modules/comment/exceptions/`

| Exceção | Motivo | Extende | HTTP |
|---|---|---|---|
| `CommentNotFoundException` | `findOne`, `update`, `remove`, `likeComment`, `unlikeComment` | `NotFoundException` | 404 |
| `RelatedTaskNotFoundException` | `create` com `taskId` inexistente | `BadRequestException` | 400 |

### 5.7 `modules/notification/exceptions/`

| Exceção | Motivo | Extende | HTTP |
|---|---|---|---|
| `NotificationNotFoundException` | `getNotificationById` quando notificação não existe | `NotFoundException` | 404 |
| `InvalidNotificationDataException` | `factory`, `service`, `entity`, strategies com payload/estrutura inválida | `BadRequestException` | 400 |
| `NotificationStrategyNotFoundException` | `factory.create` não encontra strategy para o evento | `InternalServerErrorException` (configuração) | 500 |

---

## 6. Ordem sugerida de implementação

Considerando dependências entre domínios e a necessidade de primeiro ter um filtro global funcional:

1. **Criar `ExceptionModule` e migrar o filtro global**
   - Criar estrutura (p. ex. `common/exception/` ou `modules/exception/`).
   - Mover `AllExceptionsFilter` para lá e registrá-lo como `APP_FILTER`.
   - Remover `HttpExceptionFilter` e o arquivo `http-exception.filter.ts`.
   - Ajustar `main.ts` (remover `fs`, `AllExceptionsFilter`, `useGlobalFilters`).

2. **Módulos base independentes (podem ser feitos em paralelo)**
   - `UserModule`: `UserNotFoundException` + ajustar `user.controller` (já usa `ParseIntPipe`, revisar).
   - `RoleModule`: `RoleNotFoundException`, `DuplicateRoleNameException` + `ParseIntPipe` no controller.
   - `OccupationModule`: `OccupationNotFoundException`, `DuplicateOccupationNameException` + `ParseIntPipe` no controller.

3. **Módulos que dependem de User/Occupation**
   - `ProjectModule`: `ProjectNotFoundException`, `RelatedUsersNotFoundException`, `RelatedTeamsNotFoundException` + `ParseIntPipe` no controller.
   - `TaskModule`: `TaskNotFoundException`, `RelatedUsersNotFoundException`, `RelatedOccupationsNotFoundException`, `InvalidTimerValueException` + `ParseIntPipe` no controller.

4. **Módulo que depende de Task/User**
   - `CommentModule`: `CommentNotFoundException`, `RelatedTaskNotFoundException` (controller já usa `ParseIntPipe` em endpoints de ID).

5. **Módulo autônomo de eventos/notificações**
   - `NotificationModule`: `NotificationNotFoundException`, `InvalidNotificationDataException`, `NotificationStrategyNotFoundException`.
   - Converter todos os `throw new Error` listados na seção 4 para exceções HTTP.
   - Adicionar `ParseIntPipe` nos endpoints de ID do controller.

6. **Ajustes finais e opcionais**
   - `RecurringTaskModule`: aplicar `ParseIntPipe` para padronizar.
   - `Auth` e `Events`: converter `throw new Error` restantes para `InternalServerErrorException`.
   - Rodar a suite de testes (`backend`) para garantir que as exceções customizadas mantêm os comportamentos esperados pelos specs existentes.

---

## Resumo das mudanças principais

- **1 arquivo a excluir:** `backend/src/common/filters/http-exception.filter.ts` (ou manter somente como wrapper temporário).
- **1 módulo a criar:** `ExceptionModule` para centralizar `AllExceptionsFilter`.
- **5+ controllers a ajustar:** `project`, `task`, `occupation`, `role`, `notification` (mais `recurring-task` opcional).
- **~13 `throw new Error` a converter:** 11 em `notification`, 2 em `auth`/`events`.
- **16 exceções de domínio a criar** distribuídas entre 7 módulos.
- **Alterações em `main.ts`:** remover import/instanciação de `AllExceptionsFilter` e log de arquivo `fs.appendFileSync`.
