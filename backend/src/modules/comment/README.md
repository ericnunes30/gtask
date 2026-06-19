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
  id: number               # ID único
  content: string          # Conteúdo do comentário
  task_id: number         # ID da tarefa comentada
  userId: number          # ID do usuário autor
  parentId?: number       # ID do comentário pai (para respostas)
  likesCount: number      # Contador de likes
  user: User             # Relacionamento com autor
  task: Task             # Relacionamento com tarefa
  parentComment?: Comment # Comentário pai
  replies: Comment[]      # Respostas ao comentário
  likes: CommentLike[]    # Likes do comentário
  mentionedUsers: User[]  # Usuários mencionados
  createdAt: Date        # Data de criação
  updatedAt: Date        # Data de atualização
}
```

## 👍 Entidade CommentLike

```typescript
CommentLike {
  id: number         # ID único
  commentId: number  # ID do comentário
  userId: number     # ID do usuário que curtiu
  comment: Comment   # Relacionamento com comentário
  user: User        # Relacionamento com usuário
  createdAt: Date   # Data de criação
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

### Comment Entity
- **user**: Many-to-One (autor do comentário)
- **task**: Many-to-One (tarefa comentada)
- **parentComment**: Many-to-One (comentário pai para hierarquia)
- **replies**: One-to-Many (respostas/comentários filhos)
- **likes**: One-to-Many (likes do comentário)
- **mentionedUsers**: Many-to-Many (usuários mencionados)

### CommentLike Entity  
- **comment**: Many-to-One (comentário curtido)
- **user**: Many-to-One (usuário que curtiu)

## ✨ Funcionalidades Avançadas

### Sistema Hierárquico de Comentários
- **Comentários Principais**: `parentId = null`
- **Respostas**: `parentId` aponta para comentário pai
- **Getter `repliesCount`**: Conta respostas automaticamente

### Sistema de Likes
- **Tabela `comment_likes`**: Relacionamento único por user/comment
- **Campo `likesCount`**: Contador automático (incrementado por hooks)
- **Constraint Unique**: Impede likes duplicados

### Menções de Usuários
- **Tabela pivot**: `comment_user_mentions`
- **Relacionamento Many-to-Many**: Comentário ↔ Usuários mencionados
- **Notificações**: Base para sistema de notificações

## ⚡ Performance e Otimizações

### Database
- **Indexes**: Criados automaticamente em foreign keys
- **Constraints**: Unique em comment_likes para evitar duplicatas
- **Cascade Operations**: Delete em cascade para relacionamentos

### TypeORM Features
- **Auto-increment**: Hooks para atualizar `likesCount`
- **Relations Loading**: Eager/lazy loading conforme necessário
- **Query Optimization**: Relations específicas por endpoint