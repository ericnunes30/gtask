# Activity Log Module

Módulo para logging de atividades e auditoria do sistema.

## 🏗️ Estrutura

```
activity-log/
├── entities/
│   └── activity-log.entity.ts    # Entidade ActivityLog
├── activity-log.module.ts        # Módulo TypeORM
└── README.md                     # Documentação
```

## 📋 Entidade ActivityLog

```typescript
ActivityLog {
  id: number                      # ID único
  userId?: number                 # ID do usuário que executou (opcional)
  taskId?: number                # ID da tarefa relacionada (opcional)
  actionType: string             # Tipo de ação realizada
  changedField?: string          # Campo alterado (para updates)
  oldValue?: string             # Valor anterior
  newValue?: string             # Valor novo
  referenceId?: number          # ID de referência genérico
  details?: ActivityLogDetails  # Detalhes adicionais em JSON
  createdAt: Date              # Timestamp da ação
}
```

## 📊 Interface ActivityLogDetails

```typescript
interface ActivityLogDetails {
  ip?: string;              # IP do usuário
  userAgent?: string;       # Browser/client info
  endpoint?: string;        # Endpoint chamado
  method?: string;         # HTTP method
  statusCode?: number;     # Response status
  duration?: number;       # Request duration
  additionalData?: any;    # Dados extras contextuais
}
```

## 🔗 Relacionamentos

### Many-to-One Relations
- **user**: Relacionamento opcional com User (usuário que executou)
- **task**: Relacionamento opcional com Task (tarefa relacionada)

### Campos Opcionais
- Todos os relacionamentos são opcionais para flexibilidade
- Permite logs de sistema sem usuário específico
- Suporte a diferentes tipos de atividades

## 📈 Casos de Uso

### Auditoria de Usuários
```typescript
ActivityLog {
  userId: 123,
  actionType: "LOGIN",
  details: {
    ip: "192.168.1.100",
    userAgent: "Chrome/96.0"
  }
}
```

### Mudanças em Tarefas
```typescript
ActivityLog {
  userId: 456,
  taskId: 789,
  actionType: "TASK_UPDATE",
  changedField: "status",
  oldValue: "em_andamento",
  newValue: "concluido"
}
```

### Logs de Sistema
```typescript
ActivityLog {
  actionType: "SYSTEM_BACKUP",
  referenceId: 1001,
  details: {
    endpoint: "/api/backup",
    statusCode: 200,
    duration: 5432
  }
}
```

## 🎯 Benefícios Implementados

### Rastreabilidade Completa
- **Quem**: userId identifica o responsável
- **O que**: actionType descreve a ação
- **Quando**: createdAt timestamp automático
- **Onde**: details.endpoint e details.ip
- **Como**: changedField, oldValue, newValue

### Flexibilidade de Dados
- **Campo details**: JSON para dados contextuais
- **Relacionamentos opcionais**: Não força estrutura rígida
- **Referência genérica**: referenceId para qualquer entidade

### Auditoria Empresarial
- **Compliance**: Logs para auditoria externa
- **Troubleshooting**: Rastreamento de problemas
- **Analytics**: Base para métricas de uso

## ⚡ Performance

### Database Optimization
- **Indexes**: Automaticamente em userId, taskId, createdAt
- **JSONB**: Campo details indexável no PostgreSQL
- **Partitioning**: Ready para particionamento por data

### Query Patterns
- **Time-based queries**: Otimizadas por createdAt
- **User activity**: Filtros por userId eficientes
- **Entity tracking**: Busca por taskId ou referenceId

## 🔮 Extensibilidade

### Novos Tipos de Ação
```typescript
// Facilmente extensível
actionType: "USER_CREATED" | "TASK_DELETED" | "PROJECT_ARCHIVED" | "CUSTOM_ACTION"
```

### Detalhes Personalizados
```typescript
details: {
  // Estrutura flexível
  customField: "value",
  metrics: {...},
  context: {...}
}
```

## 🚀 Status Atual

- ✅ **Entity Implementada**: TypeORM com todos os tipos
- ✅ **Module Configurado**: Importado no AppModule
- ✅ **Database Ready**: Migrations aplicadas
- 🚧 **Service Layer**: Aguardando implementação
- 🚧 **Controllers**: Aguardando implementação
- 🚧 **Interceptors**: Logging automático planejado