# Tasks Module

Módulo responsável pela gestão de tarefas do sistema.

## 🏗️ Estrutura

```
tasks/
├── controllers/
│   └── task.controller.ts       # Endpoints CRUD de tarefas
├── dto/
│   ├── create-task.dto.ts       # Validação para criação
│   └── update-task.dto.ts       # Validação para atualização
├── entities/
│   ├── enums.ts                # Status, Priority enums
│   └── task.entity.ts          # Entidade Task TypeORM
├── factories/
│   └── task-creation.factory.ts # Factory para criação
├── services/
│   └── task.service.ts         # Lógica de negócio
├── strategies/
│   ├── task-find-all.strategy.ts
│   ├── task-strategy.factory.ts
│   ├── task-timer-update.strategy.ts
│   └── task-update.strategy.ts
└── task.module.ts
```

## 📋 Entidade Task

```typescript
Task {
  id: number                    # ID único
  title: string                 # Título da tarefa
  description?: string          # Descrição detalhada
  priority: PriorityLevel       # alta, media, baixa
  status: Status               # pendente, em_andamento, concluida
  start_date: Date             # Data de início
  due_date: Date              # Data de vencimento
  project_id: number          # ID do projeto
  order?: number              # Ordem de execução
  timer: number               # Timer em segundos
  task_reviewer_id?: number   # ID do revisor
  video_url?: string          # URL do vídeo
  useful_links?: UsefulLink[] # Links úteis
  observations?: string       # Observações
  has_detailed_fields: boolean # Tem campos detalhados
  project: Project            # Relacionamento
  reviewer?: User             # Revisor
  users: User[]              # Usuários atribuídos
  occupations: Occupation[]  # Ocupações relacionadas
}
```

## 🎯 Padrões Implementados

### Factory Pattern
- **TaskCreationFactory**: Validação e defaults para criação
  - Timer padrão: 0 segundos
  - Validações de campos obrigatórios

### Strategy Pattern
- **TaskFindAllStrategy**: Diferentes métodos de busca
- **TaskUpdateStrategy**: Repository vs Entity updates
- **TaskTimerUpdateStrategy**: Diferentes validações de timer

## 📡 Endpoints

### GET /tasks
Lista todas as tarefas com relacionamentos.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Implementar Feature X",
    "description": "Descrição da tarefa",
    "priority": "alta",
    "status": "pendente",
    "timer": 3600,
    "project": {...},
    "users": [...],
    "occupations": [...]
  }
]
```

### GET /tasks/:id
Busca tarefa por ID.

### POST /tasks
Cria nova tarefa.

**Request:**
```json
{
  "title": "Nova Tarefa",
  "description": "Descrição",
  "priority": "media",
  "status": "pendente",
  "start_date": "2025-01-01",
  "due_date": "2025-01-07",
  "project_id": 1,
  "timer": 0,
  "task_reviewer_id": 1,
  "has_detailed_fields": true,
  "users": [1, 2],
  "occupations": [1]
}
```

### PUT /tasks/:id
Atualiza tarefa existente.

### DELETE /tasks/:id
Remove tarefa.

### GET /tasks/project/:projectId
Busca tarefas por projeto.

### GET /tasks/status/:status
Busca tarefas por status.

### PATCH /tasks/:id/timer
Atualiza apenas o timer da tarefa.

**Request:**
```json
{
  "timer": 7200
}
```

### POST /tasks/:id/assign-users
Atribui usuários à tarefa.

**Request:**
```json
{
  "userIds": [1, 2, 3]
}
```

## 📊 Enums

### PriorityLevel
```typescript
enum PriorityLevel {
  ALTA = 'alta',
  MEDIA = 'media',
  BAIXA = 'baixa'
}
```

### Status
```typescript
enum Status {
  PENDENTE = 'pendente',
  EM_ANDAMENTO = 'em_andamento',
  CONCLUIDA = 'concluida'
}
```

## 🧪 Testing

```bash
npm test -- --testPathPatterns="task"
```

### Testes Incluem:
- ✅ CRUD operations
- ✅ Timer updates
- ✅ User assignment
- ✅ Project/status filtering
- ✅ Strategy patterns
- ✅ Factory creation
- ✅ DTO validations

## 🚀 Uso

```typescript
// Criar tarefa (usa Factory)
const task = await taskService.create(createTaskDto);

// Atualizar timer (usa Strategy)
const task = await taskService.updateTimer(1, 3600);

// Atribuir usuários
const task = await taskService.assignUsers(1, [1, 2, 3]);

// Buscar por projeto
const tasks = await taskService.findByProject(1);

// Buscar por status
const tasks = await taskService.findByStatus('pendente');
```

## 🔗 Relacionamentos

### Many-to-One
- **project**: Projeto pai obrigatório
- **reviewer**: Usuário revisor opcional

### Many-to-Many
- **users**: Usuários atribuídos
- **occupations**: Ocupações relacionadas

## ⚡ Performance

### Strategy-based Operations
- **Repository operations**: Otimizadas para mocks/tests
- **Entity operations**: Fallback padrão
- **Relations loading**: Específico por operação

### Timer Optimization
- Validation strategy para diferentes cenários
- Minimal relations para existence checks
- Full relations para final results

## 🎭 Extensibilidade

### Nova Strategy de Update
```typescript
export class CustomUpdateStrategy implements TaskUpdateStrategy {
  canHandle(repository: any): boolean {
    return repository.customUpdate !== undefined;
  }

  async execute(id: number, dto: UpdateTaskDto, repo: Repository<Task>): Promise<Task> {
    // Lógica customizada
  }
}
```

### Nova Validação de Criação
```typescript
export class CustomTaskCreationStrategy implements TaskCreationStrategy {
  canHandle(dto: CreateTaskDto): boolean {
    return dto.priority === 'urgent';
  }

  create(dto: CreateTaskDto, repository: Repository<Task>): Task {
    // Regras especiais para tarefas urgentes
  }
}
```