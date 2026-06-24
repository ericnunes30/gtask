# Arquivos sinalizados como mortos pelo unimported — Análise

## Contexto

Foram detectados 5 arquivos que existiam em `src/` mas não eram importados por nenhum entrypoint (`src/main.ts`, `src/console.ts`). Em vez de remover automaticamente, este documento registra o desfecho de cada um.

---

## 1. `src/modules/events/services/timer.service.ts` ✅ RESOLVIDO

### Situação
Duplicata de `src/modules/tasks/services/timer.service.ts`.

### Desfecho
Removido no PR #97. O timer ativo usado pelo `EventsGateway` e pelo `StartupVerificationService` é o de `tasks/services/timer.service.ts`.

---

## 2. `src/modules/notification/dto/create-notification.dto.ts` e `update-notification.dto.ts` ✅ RESOLVIDOS

### Situação
Nenhum controller ou service importava esses DTOs. Notificações são criadas apenas via event-driven strategies.

### Desfecho
Removidos no PR #97. Se futuramente surgir CRUD manual de notificações, novos DTOs devem ser criados alinhados aos formatos reais das strategies.

---

## 3. `src/modules/permission/interfaces/permission.interface.ts` ✅ RESOLVIDO

### Situação
Definia `PermissionChecker` e `NotificationRecipientFilter`, mas o serviço real (`PermissionService`) nunca implementou essa interface. Os métodos da interface não batiam com a implementação real (nomes, parâmetros e retornos diferentes).

### Desfecho
- Interface removida.
- Criado contrato real em `src/modules/notification/interfaces/notification-recipient-resolver.interface.ts`.
- `PermissionService` renomeado para `NotificationRecipientService` e implementa o novo contrato.
- `NotificationEventListener` passou a depender do contrato via injeção de token (`NOTIFICATION_RECIPIENT_RESOLVER`).

---

## 4. `src/modules/user/dto/user-response.dto.ts` ⏸️ STANDBY

### Situação
Nenhum controller ou service retorna `UserResponseDto`. Controllers de `user` e `auth` devolvem entidades `User` brutas, o que expõe mais campos do que deveria.

### Possíveis causas
Criado para padronizar respostas de usuário, mas nunca adotado.

### Recomendação pendente
Verificar se há valor em tipar/serializar as respostas do `UserController` e `AuthController` com um DTO de resposta completo (incluindo `createdAt`, `updatedAt`, `is_active`, `whatsapp`, `roles`, `occupations`). Se sim, expandir e aplicar. Se não, remover.

### Próximo passo
Abordar em PR separado quando priorizado.
