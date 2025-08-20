# User Module

Módulo responsável pela gestão de usuários do sistema.

## 🏗️ Estrutura

```
user/
├── controllers/
│   └── user.controller.ts       # Endpoints CRUD de usuários
├── dto/
│   ├── create-user.dto.ts       # Validação para criação
│   └── update-user.dto.ts       # Validação para atualização
├── entities/
│   └── user.entity.ts           # Entidade User TypeORM
├── services/
│   └── user.service.ts          # Lógica de negócio
└── user.module.ts
```

## 👤 Entidade User

```typescript
User {
  id: number              # ID único
  name: string           # Nome completo
  email: string          # Email único
  password: string       # Senha criptografada
  roles: Role[]         # Relacionamento com roles
  occupations: Occupation[] # Relacionamento com ocupações
  projects: Project[]    # Projetos associados
  tasks: Task[]         # Tarefas atribuídas
  createdAt: Date       # Data de criação
  updatedAt: Date       # Data de atualização
}
```

## 📡 Endpoints

### GET /users
Lista todos os usuários (sem senha).

**Response:**
```json
[
  {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "createdAt": "2025-01-01T10:00:00Z",
    "updatedAt": "2025-01-01T10:00:00Z"
  }
]
```

### GET /users/:id
Busca usuário por ID com relacionamentos.

**Response:**
```json
{
  "id": 1,
  "name": "João Silva",
  "email": "joao@email.com",
  "roles": [...],
  "occupations": [...],
  "projects": [...],
  "tasks": [...]
}
```

### POST /users
Cria novo usuário.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}
```

### PUT /users/:id
Atualiza usuário existente.

**Request:**
```json
{
  "name": "João Silva Santos",
  "email": "joao.santos@email.com"
}
```

### DELETE /users/:id
Remove usuário.

### POST /users/:id/assign-roles
Atribui roles ao usuário.

**Request:**
```json
{
  "roleIds": [1, 2, 3]
}
```

## 🔍 Funcionalidades Especiais

### findByEmail
Método específico para autenticação que inclui password.

```typescript
const user = await userService.findByEmail('user@email.com');
```

### Security
- **Password**: Incluído apenas no `findByEmail`
- **Relations**: Carregadas apenas quando necessário
- **Validation**: Email único, nome obrigatório

## 🧪 Testing

```bash
npm test -- --testPathPatterns="user"
```

### Testes Incluem:
- ✅ CRUD operations
- ✅ Email lookup
- ✅ Role assignment
- ✅ DTO validations
- ✅ Not found exceptions

## 🚀 Uso

```typescript
// Criar usuário
const user = await userService.create(createUserDto);

// Buscar por email (com password)
const user = await userService.findByEmail('user@email.com');

// Buscar por ID (com relacionamentos)
const user = await userService.findOne(1);

// Atribuir roles
const user = await userService.assignRoles(1, [1, 2]);
```

## 🔗 Relacionamentos

### Many-to-Many
- **roles**: Via tabela pivot user_roles
- **occupations**: Via tabela pivot user_occupations
- **projects**: Via tabela pivot user_projects

### One-to-Many
- **tasks**: Tarefas atribuídas ao usuário

## ⚠️ Considerações

### Performance
- `findAll()` usa `select` para excluir password
- `findOne()` carrega todos os relacionamentos
- `findByEmail()` otimizado para autenticação

### Segurança
- Password nunca retornado em operações normais
- Validação de email único
- Hashing de password delegado ao auth module