# Plano de Exceções de Domínio — Manager Group Backend

> Branch: `feat/domain-exceptions` (a criar a partir de `main`)
> Data: 2026-06-26
> Base: `main` commit `94da130` (Feat/exception module #104)
> Revisão crítica: ✅ todas as claims verificadas arquivo por arquivo

---

## Resumo Quantitativo

| Categoria | Qtd |
|---|---|
| `throw new Error` → HttpException | **10** (todos em notification) |
| `NotFoundException` genérica → customizada | **28** |
| Guards `@UseGuards(JwtAuthGuard)` faltantes | **13** |
| `ParseIntPipe` faltantes | **19** |
| Validações de null silenciosas | **2** (TimerService) |
| `validateEntityIds` a adicionar | **12** |
| Código morto a limpar | **2** (CommentService) |
| Exceções de domínio a criar | **15** arquivos em 7 diretórios |
| Validações de nome duplicado faltantes | **2** (Occupation + Role) |

---

## 1. MÓDULO: Notification

### 1.1 `throw new Error` → HttpException (10)

| # | Arquivo | Linha | Mensagem atual | Nova exceção |
|---|---------|-------|---------------|-------------|
| N1 | `notification.service.ts` | 33 | `'Invalid notification data'` | `BadRequestException` |
| N2 | `notification.controller.ts` | 78 | `'Notification not found'` | `NotFoundException` |
| N3 | `notification.factory.ts` | 27 | `` `No strategy found for event type: ${eventType}` `` | `BadRequestException` |
| N4 | `notification.factory.ts` | 31 | `` `Invalid payload for event type: ${eventType}` `` | `UnprocessableEntityException` |
| N5 | `comment-created.strategy.ts` | 37 | `'Invalid payload for CommentCreatedStrategy'` | `UnprocessableEntityException` |
| N6 | `task-created.strategy.ts` | 33 | `'Invalid payload for TaskCreatedStrategy'` | `UnprocessableEntityException` |
| N7 | `task-status-updated.strategy.ts` | 33 | `'Invalid payload for TaskStatusUpdatedStrategy'` | `UnprocessableEntityException` |
| N8 | `task-updated.strategy.ts` | 35 | `'Invalid payload for TaskUpdatedStrategy'` | `UnprocessableEntityException` |
| N9 | `timer-paused.strategy.ts` | 28 | `'Invalid payload for TimerPausedStrategy'` | `UnprocessableEntityException` |
| N10 | `timer-started.strategy.ts` | 28 | `'Invalid payload for TimerStartedStrategy'` | `UnprocessableEntityException` |

### 1.2 Guards faltantes (3)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| NG1 | `notification.controller.ts` | 24 | Classe | Descomentar `@UseGuards(JwtAuthGuard)` |
| NG2 | `notification.controller.ts` | 152 | `cleanupExpired()` | Adicionar `@UseGuards(JwtAuthGuard)` |
| NG3 | `notification.controller.ts` | 160 | `cleanupOldNotifications()` | Adicionar `@UseGuards(JwtAuthGuard)` |

### 1.3 ParseIntPipe faltantes (3)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| NP1 | `notification.controller.ts` | 72 | `getNotificationById` | `@Param('id', ParseIntPipe) id: number` |
| NP2 | `notification.controller.ts` | 85 | `markAsRead` | `@Param('id', ParseIntPipe) id: number` |
| NP3 | `notification.controller.ts` | 109 | `deleteNotification` | `@Param('id', ParseIntPipe) id: number` |

### 1.4 Validações de null/affected (2)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| NV1 | `notification.service.ts` | 120-131 | `markAsRead()` | Verificar `affected === 0` → `NotFoundException` |
| NV2 | `notification.service.ts` | 143-149 | `delete()` | Verificar `affected === 0` → `NotFoundException` |

### 1.5 Exceções de domínio a criar

```
modules/notification/exceptions/
├── notification-not-found.exception.ts
├── invalid-notification-data.exception.ts
├── strategy-not-found.exception.ts
└── invalid-strategy-payload.exception.ts
```

---

## 2. MÓDULO: User

### 2.1 `NotFoundException` genérica → customizada (7)

| # | Arquivo | Linha | Mensagem atual | Nova exceção |
|---|---------|-------|---------------|-------------|
| U1 | `user.service.ts` | 125 | `'Usuario com ID ${id} nao encontrado'` | `UserNotFoundException` |
| U2 | `user.service.ts` | 168 | `'Usuario com ID ${userId} nao encontrado'` | `UserNotFoundException` |
| U3 | `user.service.ts` | 188 | `'Usuario com ID ${userId} nao encontrado'` | `UserNotFoundException` |
| U4 | `user.service.ts` | 95 | `'ADMIN role not found...'` | `RoleNotFoundException` |
| U5 | `user.service.ts` | 174 | `'Uma ou mais roles nao foram encontradas'` | `RoleNotFoundException` |
| U6 | `user.service.ts` | 54 | `'Uma ou mais occupations nao foram encontradas'` | `OccupationNotFoundException` |
| U7 | `user.service.ts` | 194 | `'Uma ou mais ocupacoes nao foram encontradas'` | `OccupationNotFoundException` |

### 2.2 Guards faltantes (7)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| UG1 | `user.controller.ts` | 28 | `findAll()` | Mover `@UseGuards(JwtAuthGuard)` para nível de classe |
| UG2 | `user.controller.ts` | 33 | `findOne()` | (mesmo) |
| UG3 | `user.controller.ts` | 38 | `update()` | (mesmo) |
| UG4 | `user.controller.ts` | 45 | `remove()` | (mesmo) |
| UG5 | `user.controller.ts` | 50 | `findByEmail()` | (mesmo) |
| UG6 | `user.controller.ts` | 55 | `assignRoles()` | (mesmo) |
| UG7 | `user.controller.ts` | 64 | `assignOccupations()` | (mesmo) |

### 2.3 Exceções de domínio a criar

```
modules/user/exceptions/
└── user-not-found.exception.ts
```

> `RoleNotFoundException` e `OccupationNotFoundException` são criadas nos módulos `role` e `occupation` respectivamente.

---

## 3. MÓDULO: Occupation

### 3.1 `NotFoundException` genérica → customizada (5)

| # | Arquivo | Linha | Mensagem atual | Nova exceção |
|---|---------|-------|---------------|-------------|
| O1 | `occupation.service.ts` | 59 | `'Ocupacao com ID ${id} nao encontrada'` | `OccupationNotFoundException` |
| O2 | `occupation.service.ts` | 94 | `'Ocupacao com ID ${id} nao encontrada'` | `OccupationNotFoundException` |
| O3 | `occupation.service.ts` | 134 | `'Ocupacao com ID ${id} nao encontrada'` | `OccupationNotFoundException` |
| O4 | `occupation.service.ts` | 104 | `'Usuario com ID ${userId} nao encontrado'` | `UserNotFoundException` |
| O5 | `occupation.service.ts` | 142 | `'Usuario com ID ${userId} nao encontrado na ocupacao'` | `UserNotInOccupationException` |

### 3.2 Validação de nome duplicado (2)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| OD1 | `occupation.service.ts` | 28 | `create()` | Verificar nome duplicado → `DuplicateOccupationNameException` |
| OD2 | `occupation.service.ts` | 65 | `update()` | Verificar nome duplicado → `DuplicateOccupationNameException` |

### 3.3 ParseIntPipe faltantes (3)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| OP1 | `occupation.controller.ts` | 30 | `findOne` | `@Param('id', ParseIntPipe) id: number` |
| OP2 | `occupation.controller.ts` | 35 | `update` | `@Param('id', ParseIntPipe) id: number` |
| OP3 | `occupation.controller.ts` | 42 | `remove` | `@Param('id', ParseIntPipe) id: number` |

### 3.4 Exceções de domínio a criar

```
modules/occupation/exceptions/
├── occupation-not-found.exception.ts
├── duplicate-occupation-name.exception.ts
└── user-not-in-occupation.exception.ts
```

---

## 4. MÓDULO: Role

### 4.1 `NotFoundException` genérica → customizada (1)

| # | Arquivo | Linha | Mensagem atual | Nova exceção |
|---|---------|-------|---------------|-------------|
| R1 | `role.service.ts` | 59 | `'Funcao com ID ${id} nao encontrada'` | `RoleNotFoundException` |

### 4.2 Validação de nome duplicado (2)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| RD1 | `role.service.ts` | 28 | `create()` | Verificar nome duplicado → `DuplicateRoleNameException` |
| RD2 | `role.service.ts` | 65 | `update()` | Verificar nome duplicado → `DuplicateRoleNameException` |

### 4.3 ParseIntPipe faltantes (3)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| RP1 | `role.controller.ts` | 28 | `findOne` | `@Param('id', ParseIntPipe) id: number` |
| RP2 | `role.controller.ts` | 33 | `update` | `@Param('id', ParseIntPipe) id: number` |
| RP3 | `role.controller.ts` | 38 | `remove` | `@Param('id', ParseIntPipe) id: number` |

### 4.4 Exceções de domínio a criar

```
modules/role/exceptions/
├── role-not-found.exception.ts
└── duplicate-role-name.exception.ts
```

---

## 5. MÓDULO: Project

### 5.1 `NotFoundException` genérica → customizada (3)

| # | Arquivo | Linha | Mensagem atual | Nova exceção |
|---|---------|-------|---------------|-------------|
| P1 | `project.service.ts` | 76 | `'Projeto com ID ${id} nao encontrado'` | `ProjectNotFoundException` |
| P2 | `project.service.ts` | 100 | `'Projeto com ID ${id} nao encontrado'` | `ProjectNotFoundException` |
| P3 | `project.service.ts` | 152 | `'Projeto com ID ${id} nao encontrado'` | `ProjectNotFoundException` |

### 5.2 `validateEntityIds` a adicionar (4)

| # | Arquivo | Linha | Método | Entidade |
|---|---------|-------|--------|----------|
| PV1 | `project.service.ts` | 35 | `create()` | `User` (users) |
| PV2 | `project.service.ts` | 42 | `create()` | `Occupation` (teams) |
| PV3 | `project.service.ts` | 107 | `update()` | `User` (users) |
| PV4 | `project.service.ts` | 116 | `update()` | `Occupation` (teams) |

### 5.3 ParseIntPipe faltantes (4)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| PP1 | `project.controller.ts` | 33 | `findOne` | `@Param('id', ParseIntPipe) id: number` |
| PP2 | `project.controller.ts` | 38 | `update` | `@Param('id', ParseIntPipe) id: number` |
| PP3 | `project.controller.ts` | 43 | `remove` | `@Param('id', ParseIntPipe) id: number` |
| PP4 | `project.controller.ts` | 48 | `findProjectTasks` | `@Param('id', ParseIntPipe) id: number` |

### 5.4 Exceções de domínio a criar

```
modules/project/exceptions/
└── project-not-found.exception.ts
```

---

## 6. MÓDULO: Task

### 6.1 `NotFoundException` genérica → customizada (5)

| # | Arquivo | Linha | Mensagem atual | Nova exceção |
|---|---------|-------|---------------|-------------|
| T1 | `task.service.ts` | 80 | `'Task with ID ${id} not found'` | `TaskNotFoundException` |
| T2 | `task.service.ts` | 141 | `'Task with ID ${id} not found'` | `TaskNotFoundException` |
| T3 | `task.service.ts` | 194 | `'Task with ID ${id} not found'` | `TaskNotFoundException` |
| T4 | `task.service.ts` | 220 | `'Task with ID ${id} not found'` | `TaskNotFoundException` |
| T5 | `task.service.ts` | 243 | `'Task with ID ${taskId} not found'` | `TaskNotFoundException` |

### 6.2 `validateEntityIds` a adicionar (5)

| # | Arquivo | Linha | Método | Entidade |
|---|---------|-------|--------|----------|
| TV1 | `task.service.ts` | 42 | `create()` | `User` (users) |
| TV2 | `task.service.ts` | 48 | `create()` | `Occupation` (occupations) |
| TV3 | `task.service.ts` | 152 | `applyUpdate()` | `User` (userIds) |
| TV4 | `task.service.ts` | 158 | `applyUpdate()` | `Occupation` (occupationIds) |
| TV5 | `task.service.ts` | 233 | `assignUsers()` | `User` (userIds) |

### 6.3 ParseIntPipe faltantes (6)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| TP1 | `task.controller.ts` | 52 | `findOne` | `@Param('id', ParseIntPipe) id: number` |
| TP2 | `task.controller.ts` | 57 | `update` | `@Param('id', ParseIntPipe) id: number` |
| TP3 | `task.controller.ts` | 64 | `patch` | `@Param('id', ParseIntPipe) id: number` |
| TP4 | `task.controller.ts` | 85 | `remove` | `@Param('id', ParseIntPipe) id: number` |
| TP5 | `task.controller.ts` | 90 | `updateTimer` | `@Param('id', ParseIntPipe) id: number` |
| TP6 | `task.controller.ts` | 95 | `assignUsers` | `@Param('id', ParseIntPipe) id: number` |

### 6.4 Validações de null silenciosas — TimerService (2)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| TM1 | `timer.service.ts` | 30-34 | `start()` | `findOne` null → lançar `TaskNotFoundException` |
| TM2 | `timer.service.ts` | 40-44 | `start()` loop | `findOne` null → lançar `TaskNotFoundException` |

### 6.5 Exceções de domínio a criar

```
modules/tasks/exceptions/
└── task-not-found.exception.ts
```

---

## 7. MÓDULO: Comment

### 7.1 `NotFoundException` genérica → customizada (6)

| # | Arquivo | Linha | Mensagem atual | Nova exceção |
|---|---------|-------|---------------|-------------|
| C1 | `comment.service.ts` | 83 | `'Comentario com ID ${id} nao encontrado'` | `CommentNotFoundException` |
| C2 | `comment.service.ts` | 102 | `'Comentario com ID ${id} nao encontrado'` | `CommentNotFoundException` |
| C3 | `comment.service.ts` | 133 | `'Comment with ID ${commentId} not found'` | `CommentNotFoundException` |
| C4 | `comment.service.ts` | 139 | `'User with ID ${userId} not found'` | `UserNotFoundException` |
| C5 | `comment.service.ts` | 164 | `'Comment with ID ${commentId} not found'` | `CommentNotFoundException` |
| C6 | `comment.service.ts` | 170 | `'User with ID ${userId} not found'` | `UserNotFoundException` |

### 7.2 `validateEntityIds` a adicionar (3)

| # | Arquivo | Linha | Método | Entidade |
|---|---------|-------|--------|----------|
| CV1 | `comment.service.ts` | 30 | `create()` | `Task` (taskId) |
| CV2 | `comment.service.ts` | 137 | `likeComment()` | `User` (userId) |
| CV3 | `comment.service.ts` | 168 | `unlikeComment()` | `User` (userId) |

### 7.3 Guards faltantes (4)

| # | Arquivo | Linha | Método | Ação |
|---|---------|-------|--------|------|
| CG1 | `comment.controller.ts` | 40 | `findAll` | Mover `@UseGuards(JwtAuthGuard)` para nível de classe |
| CG2 | `comment.controller.ts` | 48 | `findOne` | (mesmo) |
| CG3 | `comment.controller.ts` | 53 | `update` | (mesmo) |
| CG4 | `comment.controller.ts` | 60 | `remove` | (mesmo) |

### 7.4 Código morto a limpar (2)

| # | Arquivo | Linha | Descrição |
|---|---------|-------|-----------|
| CD1 | `comment.service.ts` | 131-133 | `if (!comment)` redundante após `findOneWithoutLikes` |
| CD2 | `comment.service.ts` | 162-164 | `if (!comment)` redundante após `findOneWithoutLikes` |

### 7.5 Exceções de domínio a criar

```
modules/comment/exceptions/
└── comment-not-found.exception.ts
```

---

## 8. Ordem de Implementação

Recomendada por dependências e criticidade:

| Fase | Módulo | O que | Por que |
|------|--------|-------|---------|
| **1** | `user` | Exceções + guards | `UserNotFoundException` é usada por vários módulos |
| **2** | `role` | Exceções + ParseIntPipe + duplicidade | `RoleNotFoundException` usada por user |
| **3** | `occupation` | Exceções + ParseIntPipe + duplicidade | `OccupationNotFoundException` usada por user/task/project |
| **4** | `project` | Exceções + ParseIntPipe + validateEntityIds | Depende de user/occupation exceptions |
| **5** | `tasks` | Exceções + ParseIntPipe + validateEntityIds + TimerService | Depende de user/occupation exceptions |
| **6** | `comment` | Exceções + guards + validateEntityIds + código morto | Depende de task/user exceptions |
| **7** | `notification` | throw new Error + guards + ParseIntPipe + validações | Mais complexo, melhor por último |

---

## 9. Padrão das Exceções de Domínio

Todas seguem o mesmo template:

```ts
// modules/<dominio>/exceptions/<entidade>-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class <Entidade>NotFoundException extends NotFoundException {
  constructor(id: number) {
    super({
      message: `<Entidade> with ID ${id} not found`,
      code: '<ENTIDADE>_NOT_FOUND',
    });
  }
}
```

Para duplicidade:

```ts
// modules/<dominio>/exceptions/duplicate-<entidade>-name.exception.ts
import { ConflictException } from '@nestjs/common';

export class Duplicate<Entidade>NameException extends ConflictException {
  constructor(name: string) {
    super({
      message: `<Entidade> with name "${name}" already exists`,
      code: 'DUPLICATE_<ENTIDADE>_NAME',
    });
  }
}
```

---

## 10. Verificações Pós-Implementação

- [ ] `npm run lint` — zero erros
- [ ] `npm run test` — todos passando
- [ ] `npm run build` — limpo
- [ ] `npm run quality-gate` — N1 11/11, N2 8/10
- [ ] Mensagens em inglês (frontend traduz via `code`)
- [ ] Nenhum `throw new Error` restante
- [ ] Nenhum `+id` em controllers
- [ ] Todos os controllers com `@UseGuards(JwtAuthGuard)` em nível de classe

---

## 11. Revisão Crítica — Achados

### 11.1 Bugs #4 e #5 NÃO mergeados

Os commits `ddcd40f` (fix user password logging) e `583cc96` (fix task assignUsers persistence) estavam apenas na branch local `feat/backend-unit-tests` e **não entraram na PR #102**. A `main` atual ainda tem:

- **`user.service.ts:160-163`** — `fs.appendFileSync` logando alterações de senha em `server.log`
- **`task.service.ts:238-240`** — `assignUsers` usando `taskRepository.update` com objetos parciais em relação many-to-many

**Ação:** Incluir essas correções na branch `feat/domain-exceptions` (fase 1 e fase 5 respectivamente).

### 11.2 `user.service.ts` ainda usa `fs.appendFileSync`

O `main.ts` foi limpo de `fs`, mas o `user.service.ts:160-163` ainda escreve em arquivo. Inconsistente.

**Ação:** Remover o `fs.appendFileSync` e o import de `fs` do `user.service.ts` (fase 1).

### 11.3 `notification.controller.ts` usa auth manual

O controller extrai o token manualmente via `getUserIdFromAuth()` em vez de usar `@UseGuards(JwtAuthGuard)` + `@CurrentUser()`. Frágil e inconsistente.

**Ação:** Substituir `getUserIdFromAuth()` por `@UseGuards(JwtAuthGuard)` + `@CurrentUser()` em todos os métodos (fase 7).

### 11.4 `notification.factory.ts` — mismatch de evento

`validateRequiredEvents` espera `'task.status.updated'` mas o enum/strategy usa `'task.status.changed'`.

**Ação:** Corrigir para `'task.status.changed'` no `validateRequiredEvents` (fase 7).

### 11.5 `validateEntityIds` — teste com repositório real

O helper usa `FindOptionsWhere<T>` com cast. Precisa ser testado com um repositório TypeORM real antes de aplicar em todos os módulos.

**Ação:** Testar na fase 4 (Project) primeiro, que é o módulo mais simples com `validateEntityIds`.
