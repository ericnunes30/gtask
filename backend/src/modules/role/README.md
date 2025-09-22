# Role Module

Módulo responsável pela gestão de papéis/funções no sistema.

## 🏗️ Estrutura

```
role/
├── controllers/
│   └── role.controller.ts       # Endpoints CRUD
├── dto/
│   ├── create-role.dto.ts       # Validação para criação
│   └── update-role.dto.ts       # Validação para atualização
├── entities/
│   └── role.entity.ts           # Entidade Role
├── services/
│   └── role.service.ts          # Lógica de negócio
└── role.module.ts
```

## 👥 Entidade Role

```typescript
Role {
  id: number           # ID único
  name: string         # Nome da função
  description?: string # Descrição da função
  users: User[]       # Usuários com esta função
  createdAt: Date     # Data de criação
  updatedAt: Date     # Data de atualização
}
```

## 📡 Endpoints

### GET /roles
Lista todas as funções com usuários.

### GET /roles/:id
Busca função específica.

### POST /roles
Cria nova função.

**Request:**
```json
{
  "name": "Administrator",
  "description": "Acesso total ao sistema"
}
```

### PUT /roles/:id
Atualiza função existente.

### DELETE /roles/:id
Remove função.

## 🔗 Relacionamentos

- **users**: Many-to-Many via user_roles