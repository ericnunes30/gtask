# Activity Log Module

Módulo para logging de atividades do sistema (em desenvolvimento).

## 🏗️ Estrutura

```
activity-log/
└── entities/
    └── activity-log.entity.ts    # Entidade para logs
```

## 📋 Entidade ActivityLog

```typescript
ActivityLog {
  id: number           # ID único
  action: string       # Ação realizada
  entityType: string   # Tipo de entidade
  entityId: number     # ID da entidade
  userId: number       # Usuário que executou
  metadata: object     # Dados adicionais
  timestamp: Date      # Quando ocorreu
}
```

## 🚧 Status

Este módulo está em desenvolvimento e não possui implementação completa ainda.

### Funcionalidades Planejadas
- Log de criação/edição/exclusão de entidades
- Rastreamento de mudanças
- Auditoria de ações de usuários
- Dashboard de atividades
- Filtros por usuário/data/ação