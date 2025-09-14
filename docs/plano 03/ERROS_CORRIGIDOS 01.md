# Correções de Erros - Plano 03

## Erros Encontrados e Corrigidos

### 1. ReferenceError: data is not defined
**Arquivo:** `frontend/src/services/backend/tasks/index.ts`
**Linha:** 128
**Problema:** A variável `data` estava sendo acessada no invalidateKeys sem estar definida no contexto.
**Solução:** Substituir `data?.projectId` por `newTask.projectId`

**Antes:**
```typescript
...(data?.projectId ? [queryKeys.tasks.byProject(data.projectId)] : []),
```

**Depois:**
```typescript
...(newTask.projectId ? [queryKeys.tasks.byProject(newTask.projectId)] : []),
```

### 2. ReferenceError: data is not defined
**Arquivo:** `frontend/src/services/backend/comments/index.ts`
**Linha:** 121
**Problema:** A variável `data` estava sendo acessada no invalidateKeys sem estar definida no contexto.
**Solução:** Substituir `data?.taskId` por `newComment.taskId`

**Antes:**
```typescript
...(data?.taskId ? [queryKeys.comments.byTask(data.taskId)] : []),
```

**Depois:**
```typescript
...(newComment.taskId ? [queryKeys.comments.byTask(newComment.taskId)] : []),
```

## Status

✅ Todos os erros foram corrigidos
✅ Build funcionando sem erros
✅ Aplicação pronta para uso