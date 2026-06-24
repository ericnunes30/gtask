# Arquivos sinalizados como mortos pelo unimported — Análise

## Contexto

Foram detectados 5 arquivos que existem em `src/` mas não são importados por nenhum entrypoint (`src/main.ts`, `src/console.ts`). Em vez de remover automaticamente, este documento analisa **por que** cada um está nessa situação e qual a recomendação.

---

## 1. `src/modules/events/services/timer.service.ts`

### Situação
Duplicata de lógica de timer. Existe outro `src/modules/tasks/services/timer.service.ts`.

### Diferenças entre os dois
| Aspecto | `events/services/timer.service.ts` | `tasks/services/timer.service.ts` |
|---|---|---|
| Injeção de `TaskService` | Sim (`taskService.updateTimer`) | Não (grava no `taskRepository` diretamente) |
| Emite eventos via | `server.to(task_X).emit(...)` WebSocket | `EventEmitter2` (`timer.tick`, `timer.started`, `timer.paused`) |
| setServer(server) | Sim | Não |
| Persistência do timer | via `taskService.updateTimer` | via `taskRepository.update` |

### Hipótese
O arquivo `events/services/timer.service.ts` parece ser uma **implementação antiga** que foi movida para `tasks/services/timer.service.ts` durante uma refatoração. Ele possui uma referência a `TaskService`, o que pode gerar circular dependency entre `events` e `tasks` (o `events.module.ts` já usa `forwardRef(() => TaskModule)`).

### Recomendação
**Remover** após confirmar que o frontend/WebSocket consome os eventos emitidos por `tasks/services/timer.service.ts`. A implementação ativa parece ser a de `tasks/services/timer.service.ts`.

---

## 2. `src/modules/notification/dto/create-notification.dto.ts` e `update-notification.dto.ts`

### Situação
Nenhum controller ou service importa esses DTOs. O `NotificationController` usa `NotificationQueryDto` para query params, mas não recebe body de criação/atualização. As notificações são criadas internamente pelas strategies (`TaskCreatedStrategy`, `CommentCreatedStrategy`, etc.), que usam os próprios dados do evento.

### Possíveis causas
1. Foram criados antecipadamente para endpoints de CRUD de notificações que nunca foram implementados.
2. As notificações são geradas automaticamente por eventos, então nunca houve POST `/notifications`.

### Recomendação
Se o produto **não** precisa de endpoints para criar/editar notificações manualmente, esses DTOs podem ser removidos. Caso contrário, devem ser usados no `NotificationController`.

---

## 3. `src/modules/permission/interfaces/permission.interface.ts`

### Situação
Define `PermissionChecker` e `NotificationRecipientFilter`, mas `PermissionService` não implementa essa interface. A service possui métodos similares (`getTaskCreatedNotificationRecipients`, etc.) com nomes diferentes e sem relação de implements.

### Possíveis causas
A interface é um **contrato antigo** que foi abandonado durante refatorações. O `PermissionService` atual resolve o problema de filtragem de notificados de forma concreta, sem interface.

### Recomendação
**Remover** a interface, a menos que haja plano de ter múltiplas implementações de `PermissionChecker` (não há indício de variação real).

---

## 4. `src/modules/user/dto/user-response.dto.ts`

### Situação
Nenhum controller ou service retorna `UserResponseDto`. O `UserController` provavelmente retorna entidades diretamente ou outro DTO.

### Possíveis causas
Criado para padronizar respostas de usuário, mas nunca adotado.

### Recomendação
Verificar se há valor em tipar as respostas do `UserController` e `AuthController` com este DTO. Se sim, aplicar. Se não, remover.

---

## Próximos passos

Antes de qualquer remoção, precisamos decidir:

1. O timer ativo no WebSocket é o de `events` ou `tasks`?
2. Notificações devem ter endpoints POST/PUT ou são apenas reativas a eventos?
3. `PermissionService` deve implementar uma interface ou permanecer concreto?
4. `UserResponseDto` deve ser usado nos controllers de user/auth?

**Sugestão:** abordar essas questões em PRs separados para não misturar a infraestrutura do Quality Gate com refatorações de negócio. A branch atual (`feat/quality-gate-imports-dead-files`) deve apenas **instalar a ferramenta** e **ignorar temporariamente** esses arquivos para o critério 1.12 passar, com documentação do débito técnico.
