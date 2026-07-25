# Mapeamento Completo: Entidades que Precisam Emitir Eventos WebSocket

> **Fonte da verdade:** Frontend (páginas e componentes)
> **Data:** 2026-07-25
> **Status:** Tarefas implementadas. Demais entidades mapeadas e pendentes.

---

## Legenda

| Status | Descrição |
|--------|-----------|
| ✅ **Implementado** | Evento existe no backend + bridge WebSocket + listener frontend |
| ⚠️ **Parcial** | Evento existe no backend mas sem bridge WebSocket, ou com gaps |
| ❌ **Pendente** | Evento não existe no backend. Precisa criar emit + bridge + listener |
| 🔴 **Bug** | Código frontend quebrado ou desatualizado (usa localStorage em vez de API) |

---

## 1. TAREFAS (Task) — Status: ✅ IMPLEMENTADO

### Páginas afetadas
- `/tasks` — Kanban de tarefas
- `/calendar` — Calendário com tarefas
- `/` (Dashboard) — Widget de tarefas
- `/task-details/:id` — Detalhes da tarefa (⚠️ usa localStorage — ver seção 8)

### Eventos necessários
| Evento | Já existe no backend? | Bridge WS? | Listener frontend? | Impacto |
|--------|----------------------|------------|-------------------|---------|
| `task.created` | ✅ `task.service.ts:63` | ✅ `events.gateway.ts` | ✅ `useTaskSocket.ts` | Outro usuário cria tarefa → aparece no kanban |
| `task.updated` | ✅ `task.service.ts:114` | ✅ `events.gateway.ts` | ✅ `useTaskSocket.ts` | Outro usuário edita tarefa → dados atualizam |
| `task.status.changed` | ✅ `task.service.ts:121` | ✅ `events.gateway.ts` | ✅ `useTaskSocket.ts` | Outro usuário move no kanban → coluna atualiza |
| `task.assignees.updated` | ✅ `task.service.ts:130` | ❌ **SEM BRIDGE** | ❌ | Responsável muda — não notifica em tempo real |
| `task.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro usuário deleta tarefa → ainda aparece na tela |

### Ações que disparam eventos (frontend → backend)
- Criar tarefa (`useCreateTask`)
- Editar tarefa (`useUpdateTask`)
- Mover no kanban (`useUpdateTask` com status)
- Deletar tarefa (`useDeleteTask`)

### Rooms WebSocket usadas
- `tasks_all` — usuários na página /tasks
- `project_{id}` — usuários vendo tarefas do projeto
- `user_{assigneeId}` — responsável pela tarefa

---

## 2. PROJETOS (Project) — Status: ❌ PENDENTE

### Páginas afetadas
- `/projects` — Lista de projetos
- `/tasks?projectId=X` — Tarefas filtradas por projeto
- `/` (Dashboard) — Cards de projetos

### Eventos necessários
| Evento | Já existe no backend? | Bridge WS? | Listener frontend? | Impacto |
|--------|----------------------|------------|-------------------|---------|
| `project.created` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro usuário cria projeto → não aparece na lista |
| `project.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro usuário edita projeto → dados desatualizados |
| `project.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro usuário deleta projeto → ainda aparece |
| `project.progress.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Tarefa concluída afeta progresso → barra não atualiza |

### Ações que deveriam disparar eventos
- Criar projeto (`useCreateProject`)
- Editar projeto (`useUpdateProject`)
- Deletar projeto (`useDeleteProject`)
- Tarefa concluída (afeta progresso do projeto)

### Onde adicionar no backend
- `backend/src/modules/project/services/project.service.ts`
  - Adicionar `this.eventEmitter.emit('project.created', ...)` após criação
  - Adicionar `this.eventEmitter.emit('project.updated', ...)` após edição
  - Adicionar `this.eventEmitter.emit('project.deleted', ...)` após deleção

---

## 3. USUÁRIOS (User) — Status: ❌ PENDENTE

### Páginas afetadas
- `/users` — Lista de usuários
- `/teams` — Membros de equipes (lista de usuários)
- `/tasks` — Filtro de responsável

### Eventos necessários
| Evento | Já existe no backend? | Bridge WS? | Listener frontend? | Impacto |
|--------|----------------------|------------|-------------------|---------|
| `user.created` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro admin cria usuário → não aparece na lista |
| `user.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro admin edita usuário → dados desatualizados |
| `user.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro admin deleta usuário → ainda aparece |
| `user.status.changed` | ❌ **NÃO EXISTE** | ❌ | ❌ | Outro admin ativa/desativa → toggle não atualiza |

### Ações que deveriam disparar eventos
- Criar usuário (`useCreateUser`)
- Editar usuário (`useUpdateUser`)
- Deletar usuário (`useDeleteUser`)
- Toggle status ativo/inativo

### Onde adicionar no backend
- `backend/src/modules/user/services/user.service.ts`
  - Adicionar emits após cada operação CRUD

---

## 4. EQUIPES / OCUPAÇÕES (Team/Occupation) — Status: ❌ PENDENTE

### Páginas afetadas
- `/teams` — Lista de equipes/ocupações
- `/users` — Filtro de equipe
- `/projects` — Equipe atribuída ao projeto

### Eventos necessários
| Evento | Já existe no backend? | Bridge WS? | Listener frontend? | Impacto |
|--------|----------------------|------------|-------------------|---------|
| `team.created` | ❌ **NÃO EXISTE** | ❌ | ❌ | Nova equipe não aparece |
| `team.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Dados de equipe desatualizados |
| `team.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Equipe deletada ainda aparece |
| `team.user.added` | ❌ **NÃO EXISTE** | ❌ | ❌ | Membro adicionado → lista não atualiza |
| `team.user.removed` | ❌ **NÃO EXISTE** | ❌ | ❌ | Membro removido → lista não atualiza |
| `occupation.created` | ❌ **NÃO EXISTE** | ❌ | ❌ | Nova ocupação não aparece |
| `occupation.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Dados desatualizados |
| `occupation.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Ocupação deletada ainda aparece |

### Onde adicionar no backend
- `backend/src/modules/occupation/services/occupation.service.ts`
- `backend/src/modules/teams/services/team.service.ts` (se existir)

---

## 5. CARGOS (Role) — Status: ❌ PENDENTE

### Páginas afetadas
- `/users` — Criação/edição de usuários (select de roles)
- Configurações de permissões

### Eventos necessários
| Evento | Já existe no backend? | Bridge WS? | Listener frontend? | Impacto |
|--------|----------------------|------------|-------------------|---------|
| `role.created` | ❌ **NÃO EXISTE** | ❌ | ❌ | Novo cargo não aparece no select |
| `role.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Permissões alteradas não refletem |
| `role.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Cargo deletado ainda no select |

### Onde adicionar no backend
- `backend/src/modules/role/services/role.service.ts`

---

## 6. COMENTÁRIOS (Comment) — Status: ⚠️ PARCIAL

### Páginas afetadas
- `/task-details/:id` — Comentários da tarefa (🔴 usa localStorage!)
- Kanban (modal de detalhes da tarefa)

### Eventos necessários
| Evento | Já existe no backend? | Bridge WS? | Listener frontend? | Impacto |
|--------|----------------------|------------|-------------------|---------|
| `comment.created` | ✅ `comment.service.ts:56` | ✅ `events.gateway.ts` | ✅ `useTaskSocket.ts` | Novo comentário aparece em tempo real |
| `comment.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Edição de comentário não reflete |
| `comment.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Deleção de comentário não reflete |

### Onde adicionar no backend
- `backend/src/modules/comment/services/comment.service.ts`
  - Adicionar emit após update e delete

---

## 7. TAREFAS RECORRENTES (RecurringTask) — Status: ❌ PENDENTE

### Páginas afetadas
- `/tasks` — Dialog de tarefas recorrentes

### Eventos necessários
| Evento | Já existe no backend? | Bridge WS? | Listener frontend? | Impacto |
|--------|----------------------|------------|-------------------|---------|
| `recurring-task.created` | ❌ **NÃO EXISTE** | ❌ | ❌ | Nova recorrente não aparece |
| `recurring-task.updated` | ❌ **NÃO EXISTE** | ❌ | ❌ | Dados desatualizados |
| `recurring-task.deleted` | ❌ **NÃO EXISTE** | ❌ | ❌ | Ainda aparece na lista |

### Onde adicionar no backend
- `backend/src/modules/recurring-task/services/recurring-task.service.ts`

---

## 8. TIMER — Status: ✅ IMPLEMENTADO

### Páginas afetadas
- `/tasks` — Kanban (ícone de timer)
- `/task-details/:id` — Timer da tarefa
- Dashboard

### Eventos
| Evento | Já existe? | Bridge? | Listener? |
|--------|-----------|---------|-----------|
| `timer.started` | ✅ | ✅ | ✅ |
| `timer.paused` | ✅ | ✅ | ✅ |
| `timer.tick` | ✅ | ✅ | ✅ |
| `timer.updated` | ✅ | ✅ | ✅ |

---

## 9. NOTIFICAÇÕES — Status: ✅ IMPLEMENTADO

### Páginas afetadas
- Todas (header com badge de notificações)

### Eventos
| Evento | Já existe? | Bridge? | Listener? |
|--------|-----------|---------|-----------|
| `notification` | ✅ | ✅ | ✅ |
| `new_structured_notification` | ✅ | ✅ | ✅ |

---

## 10. TASK DETAILS — Status: 🔴 BUG CRÍTICO

### Problema
`frontend/src/pages/TaskDetails.tsx` usa **localStorage** para armazenar tarefas e comentários em vez de:
- React Query (`useGetTask`, `useGetCommentsByTask`)
- API REST (`/tasks/:id`, `/comments?taskId=X`)
- WebSocket

### Impacto
- Qualquer ação (editar, comentar, deletar) na página de detalhes **NÃO sincroniza com o backend**
- Outros usuários não veem as mudanças
- Ao recarregar a página, os dados podem ser perdidos ou inconsistentes
- A página está funcionalmente **quebrada** para uso multiusuário

### Correção necessária
Refatorar `TaskDetails.tsx` para usar:
1. `useGetTask(taskId)` para buscar tarefa
2. `useGetCommentsByTask(taskId)` para buscar comentários
3. `useUpdateTask()` / `useDeleteTask()` para mutações
4. `useCreateComment()` / `useUpdateComment()` / `useDeleteComment()` para comentários

---

## Resumo Executivo

| Categoria | Quantidade | Status |
|-----------|-----------|--------|
| Eventos já implementados (com bridge WS) | 7 | ✅ |
| Eventos que precisam de bridge WS | 1 | ⚠️ (task.assignees.updated) |
| Eventos que precisam ser criados no backend | 25+ | ❌ |
| Páginas com bug crítico (localStorage) | 1 | 🔴 |

### Próximos passos recomendados (ordem de prioridade)

1. **🔴 URGENTE:** Refatorar `TaskDetails.tsx` para usar API em vez de localStorage
2. **❌ ALTA:** Adicionar eventos para Projects (project.created, project.updated, project.deleted)
3. **❌ ALTA:** Adicionar eventos para Users (user.created, user.updated, user.deleted, user.status.changed)
4. **❌ MÉDIA:** Adicionar eventos para Teams/Occupations
5. **❌ MÉDIA:** Adicionar eventos para Comments (comment.updated, comment.deleted)
6. **⚠️ BAIXA:** Adicionar bridge para task.assignees.updated
7. **❌ BAIXA:** Adicionar eventos para Roles e RecurringTasks
