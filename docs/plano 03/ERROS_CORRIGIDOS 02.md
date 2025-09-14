# Correções de Erros - Plano 03

## Erros Encontrados e Corrigidos

### 1. ReferenceError: data is not defined
**Arquivo:** `frontend/src/services/backend/tasks/index.ts`
**Linha:** 128
**Problema:** A variável `data` estava sendo acessada no invalidateKeys sem estar definida no contexto.
**Solução:** Transformar invalidateKeys em função e acessar através do contexto

**Antes:**
```typescript
invalidateKeys: [
  queryKeys.tasks.lists(),
  queryKeys.projects.lists(),
  ...(newTask.projectId ? [queryKeys.tasks.byProject(newTask.projectId)] : []),
],
```

**Depois:**
```typescript
invalidateKeys: (data, variables, context) => [
  queryKeys.tasks.lists(),
  queryKeys.projects.lists(),
  ...(context?.newTask?.projectId ? [queryKeys.tasks.byProject(context.newTask.projectId)] : []),
],
```

### 2. ReferenceError: newTask is not defined
**Arquivo:** `frontend/src/services/backend/tasks/index.ts`
**Problema:** A variável `newTask` não estava disponível no contexto do invalidateKeys.
**Solução:** Adicionar `newTask` ao retorno do onMutate e acessar através do contexto

### 3. ReferenceError: data is not defined
**Arquivo:** `frontend/src/services/backend/comments/index.ts`
**Linha:** 121
**Problema:** A variável `data` estava sendo acessada no invalidateKeys sem estar definida no contexto.
**Solução:** Transformar invalidateKeys em função e acessar através do contexto

**Antes:**
```typescript
invalidateKeys: [
  queryKeys.comments.lists(),
  ...(newComment.taskId ? [queryKeys.comments.byTask(newComment.taskId)] : []),
],
```

**Depois:**
```typescript
invalidateKeys: (data, variables, context) => [
  queryKeys.comments.lists(),
  ...(context?.newComment?.taskId ? [queryKeys.comments.byTask(context.newComment.taskId)] : []),
],
```

## Status

✅ Todos os erros foram corrigidos
✅ Build funcionando sem erros
✅ Aplicação pronta para uso