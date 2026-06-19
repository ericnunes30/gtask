# Módulo de Tasks - Especificação

## Enums Necessários

### PriorityLevel
```typescript
export enum PriorityLevel {
  Low = 'baixa',
  Medium = 'media', 
  High = 'alta',
  Urgent = 'urgente'
}
```

### Status
```typescript
export enum Status {
  Backlog = 'pendente',
  ToDo = 'a_fazer',
  InProgress = 'em_andamento',
  Review = 'em_revisao',
  WaitingClient = 'aguardando_cliente',
  Done = 'concluido',
  Cancelled = 'cancelado'
}
```

## Próximos Passos
1. Implementar os enums em `src/modules/tasks/db/enums.ts`
2. Criar a entidade Task com todos os campos e relacionamentos