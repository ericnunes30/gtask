# Comment Module

Módulo responsável pelo sistema de comentários em tarefas.

## 🏗️ Estrutura

```
comment/
├── controllers/
│   └── comment.controller.ts    # Endpoints CRUD
├── dto/
│   ├── create-comment.dto.ts    # Validação para criação
│   └── update-comment.dto.ts    # Validação para atualização
├── entities/
│   ├── comment.entity.ts        # Entidade Comment
│   └── comment-like.entity.ts   # Entidade para likes
├── services/
│   └── comment.service.ts       # Lógica de negócio
└── comment.module.ts
```

## 💬 Entidade Comment

```typescript
Comment {
  id: number           # ID único
  content: string      # Conteúdo do comentário
  userId: number       # ID do usuário autor
  taskId: number       # ID da tarefa comentada
  user: User          # Relacionamento com autor
  task: Task          # Relacionamento com tarefa
  createdAt: Date     # Data de criação
  updatedAt: Date     # Data de atualização
}
```

## 📡 Endpoints

### GET /comments
Lista todos os comentários com user e task.

### GET /comments/:id
Busca comentário específico.

### POST /comments
Cria novo comentário.

**Request:**
```json
{
  "content": "Excelente trabalho na implementação!",
  "userId": 1,
  "taskId": 5
}
```

### PUT /comments/:id
Atualiza comentário existente.

### DELETE /comments/:id
Remove comentário.

## 🧪 Testing

```bash
npm test -- --testPathPatterns="comment"
```

## 🔗 Relacionamentos

- **user**: Many-to-One (autor)
- **task**: Many-to-One (tarefa comentada)