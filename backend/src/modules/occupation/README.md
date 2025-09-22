# Occupation Module

Módulo responsável pela gestão de ocupações/cargos no sistema.

## 🏗️ Estrutura

```
occupation/
├── controllers/
│   └── occupation.controller.ts    # Endpoints CRUD
├── dto/
│   ├── create-occupation.dto.ts    # Validação para criação
│   └── update-occupation.dto.ts    # Validação para atualização
├── entities/
│   └── occupation.entity.ts        # Entidade Occupation
├── services/
│   └── occupation.service.ts       # Lógica de negócio
└── occupation.module.ts
```

## 💼 Entidade Occupation

```typescript
Occupation {
  id: number               # ID único
  name: string             # Nome da ocupação
  description?: string     # Descrição da ocupação
  users: User[]           # Usuários com esta ocupação
  projects: Project[]     # Projetos relacionados
  tasks: Task[]          # Tarefas relacionadas
  createdAt: Date        # Data de criação
  updatedAt: Date        # Data de atualização
}
```

## 📡 Endpoints

### GET /occupations
Lista todas as ocupações com relacionamentos.

### GET /occupations/:id
Busca ocupação específica.

### POST /occupations
Cria nova ocupação.

**Request:**
```json
{
  "name": "Desenvolvedor Frontend",
  "description": "Responsável pelo desenvolvimento da interface"
}
```

### PUT /occupations/:id
Atualiza ocupação existente.

### DELETE /occupations/:id
Remove ocupação.

## 🔗 Relacionamentos

- **users**: Many-to-Many
- **projects**: Many-to-Many  
- **tasks**: Many-to-Many