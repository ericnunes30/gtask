# Project Module

Módulo responsável pela gestão de projetos do sistema.

## 🏗️ Estrutura

```
project/
├── controllers/
│   └── project.controller.ts    # Endpoints CRUD de projetos
├── dto/
│   ├── create-project.dto.ts    # Validação para criação
│   └── update-project.dto.ts    # Validação para atualização
├── entities/
│   └── project.entity.ts        # Entidade Project TypeORM
├── services/
│   └── project.service.ts       # Lógica de negócio
└── project.module.ts
```

## 📊 Entidade Project

```typescript
Project {
  id: number                    # ID único
  title: string                 # Título do projeto
  description?: string          # Descrição detalhada
  status: boolean              # Ativo/Inativo
  priority: PriorityLevel      # alta, media, baixa
  start_date: Date            # Data de início
  end_date?: Date             # Data de término
  tasks: Task[]               # Tarefas do projeto
  users: User[]              # Usuários atribuídos
  occupations: Occupation[]  # Ocupações relacionadas
  createdAt: Date            # Data de criação
  updatedAt: Date            # Data de atualização
}
```

## 📡 Endpoints

### GET /projects
Lista todos os projetos com relacionamentos.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Sistema de Gestão",
    "description": "Desenvolvimento do sistema principal",
    "status": true,
    "priority": "alta",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-12-31T23:59:59Z",
    "tasks": [...],
    "users": [...],
    "occupations": [...]
  }
]
```

### GET /projects/:id
Busca projeto por ID com todos os relacionamentos.

### POST /projects
Cria novo projeto.

**Request:**
```json
{
  "title": "Novo Projeto",
  "description": "Descrição do projeto",
  "status": true,
  "priority": "media",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-06-30T23:59:59Z"
}
```

### PUT /projects/:id
Atualiza projeto existente.

### DELETE /projects/:id
Remove projeto (cascade para tarefas relacionadas).

### GET /projects/:id/tasks
Busca todas as tarefas de um projeto específico.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Tarefa do Projeto",
    "users": [...],
    "occupations": [...]
  }
]
```

## 🔍 Funcionalidades Especiais

### findProjectTasks
Método otimizado para buscar tarefas de um projeto com related data.

```typescript
const tasks = await projectService.findProjectTasks(projectId);
```

**Features:**
- Carrega tarefas com usuários e ocupações
- Validação de existência do projeto
- Otimizado para performance

## 🧪 Testing

```bash
npm test -- --testPathPatterns="project"
```

### Testes Incluem:
- ✅ CRUD operations
- ✅ Project tasks retrieval
- ✅ Not found exceptions
- ✅ DTO validations
- ✅ Cascade operations

## 🚀 Uso

```typescript
// Criar projeto
const project = await projectService.create(createProjectDto);

// Buscar com relacionamentos
const project = await projectService.findOne(1);

// Buscar tarefas do projeto
const tasks = await projectService.findProjectTasks(1);

// Atualizar
const updated = await projectService.update(1, updateDto);
```

## 🔗 Relacionamentos

### One-to-Many
- **tasks**: Tarefas pertencentes ao projeto
- **recurringTasks**: Tarefas recorrentes do projeto

### Many-to-Many
- **users**: Usuários atribuídos ao projeto
- **occupations**: Ocupações relacionadas ao projeto

## 📊 Status Management

### Boolean Status
- `true`: Projeto ativo
- `false`: Projeto inativo/arquivado

### Priority Levels
- **alta**: Projetos críticos
- **media**: Projetos normais  
- **baixa**: Projetos de menor prioridade

## ⚡ Performance

### Relations Loading
- `findAll()`: Carrega tasks, users, occupations
- `findOne()`: Carrega todos os relacionamentos
- `findProjectTasks()`: Otimizado para tasks específicas

### Query Optimization
- Relations específicas por endpoint
- Lazy loading quando apropriado
- Indexes em campos de busca comum

## 📋 Business Rules

### Validation
- Título obrigatório
- Data de início obrigatória
- Data de término opcional (projetos indefinidos)
- Status padrão: true (ativo)

### Cascade Operations
- Deletar projeto não remove tarefas (business rule)
- Tarefas órfãs precisam ser reatribuídas
- Users e occupations mantém relacionamentos

## ⚠️ Considerações

### Data Integrity
- Foreign keys protegidas
- Relacionamentos many-to-many mantidos
- Soft delete não implementado (hard delete)

### Timeline Management
- start_date sempre obrigatória
- end_date opcional para projetos contínuos
- Validação de datas no DTO level

### User Assignment
- Usuários podem estar em múltiplos projetos
- Ocupações definem papel no projeto
- Relacionamento flexível via pivot tables