# Recurring Task Module

Módulo responsável pela gestão de tarefas recorrentes do sistema.

## 🏗️ Estrutura

```
recurring-task/
├── controllers/
│   └── recurring-task.controller.ts    # Endpoints CRUD
├── dto/
│   ├── create-recurring-task.dto.ts    # Validação para criação
│   └── update-recurring-task.dto.ts    # Validação para atualização
├── entities/
│   └── recurring-task.entity.ts        # Entidade RecurringTask
├── enhancers/
│   ├── occupation-enhancer.ts          # Enhancement de ocupações
│   └── recurring-task-enhancer.interface.ts
├── factories/
│   ├── recurring-task-creation.factory.ts  # Factory para criação
│   └── recurring-task-update.factory.ts    # Factory para updates
├── services/
│   └── recurring-task.service.ts       # Lógica de negócio
└── recurring-task.module.ts
```

## 🔄 Entidade RecurringTask

```typescript
RecurringTask {
  id: number                    # ID único
  name: string                  # Nome da tarefa recorrente
  templateData: TemplateData    # Template para gerar tarefas
  next_due_date: Date          # Próxima data de execução
  is_active: boolean           # Está ativa
  schedule_type: ScheduleType  # interval ou cron
  frequency_interval?: string  # Intervalo (ex: "7d")
  frequency_cron?: string      # Expressão cron
  userId: number               # ID do usuário responsável
  projectId: number            # ID do projeto
  user: User                   # Relacionamento
  project: Project             # Relacionamento
  tasks: Task[]               # Tarefas geradas
}
```

### TemplateData Structure
```typescript
TemplateData {
  title: string                # Título da tarefa a ser gerada
  description?: string         # Descrição
  priority: PriorityLevel     # Prioridade
  start_date: string          # Data relativa (ex: "+0d")
  due_date: string           # Data relativa (ex: "+7d")
  assignee_ids?: number[]    # IDs dos usuários
  occupation_ids?: number[]  # IDs das ocupações
  occupations?: Occupation[] # Ocupações carregadas (enhanced)
}
```

## 🎯 Padrões Implementados

### Factory Pattern
- **RecurringTaskCreationFactory**: Regras complexas de criação
  - Default `next_due_date`: Data atual se não fornecida
  - Default `is_active`: true se não fornecido
  - Validação e estruturação de `templateData`

- **RecurringTaskUpdateFactory**: Regras complexas de atualização
  - Merge inteligente de `templateData`
  - Conversão de datas
  - Preservação de valores existentes

### Decorator Pattern
- **OccupationEnhancer**: Enriquece tarefas com dados de ocupações
  - `enhance()`: Single task enhancement
  - `enhanceMany()`: Batch enhancement
  - Carregamento automático via `occupation_ids`

## 📡 Endpoints

### GET /recurring-tasks
Lista todas as tarefas recorrentes com ocupações carregadas.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Backup Semanal",
    "next_due_date": "2025-01-07T10:00:00Z",
    "is_active": true,
    "schedule_type": "interval",
    "frequency_interval": "7d",
    "templateData": {
      "title": "Backup do Sistema",
      "priority": "alta",
      "occupation_ids": [1],
      "occupations": [
        {
          "id": 1,
          "name": "DevOps"
        }
      ]
    }
  }
]
```

### GET /recurring-tasks/:id
Busca tarefa recorrente por ID com enhancement.

### POST /recurring-tasks
Cria nova tarefa recorrente.

**Request:**
```json
{
  "name": "Backup Diário",
  "templateData": {
    "title": "Backup Automático",
    "description": "Backup dos dados principais",
    "priority": "media",
    "start_date": "+0d",
    "due_date": "+1d",
    "occupation_ids": [1, 2]
  },
  "next_due_date": "2025-01-01T02:00:00Z",
  "is_active": true,
  "schedule_type": "interval",
  "frequency_interval": "1d",
  "userId": 1,
  "projectId": 1
}
```

### PUT /recurring-tasks/:id
Atualiza tarefa recorrente.

### DELETE /recurring-tasks/:id
Remove tarefa recorrente.

## 📅 Schedule Types

### Interval
Execução baseada em intervalos fixos.

```json
{
  "schedule_type": "interval",
  "frequency_interval": "7d"    // 1h, 1d, 7d, 30d, etc.
}
```

### Cron
Execução baseada em expressões cron.

```json
{
  "schedule_type": "cron",
  "frequency_cron": "0 2 * * 0"  // Todo domingo às 2h
}
```

## 🧪 Testing

```bash
npm test -- --testPathPatterns="recurring-task"
```

### Testes Incluem:
- ✅ CRUD operations com Factory
- ✅ Enhancement de ocupações
- ✅ Default values (is_active, next_due_date)
- ✅ TemplateData merge logic
- ✅ DTO validations
- ✅ Decorator pattern

## 🚀 Uso

```typescript
// Criar (usa Creation Factory)
const recurringTask = await recurringTaskService.create(createDto);

// Atualizar (usa Update Factory + Enhancement)
const updated = await recurringTaskService.update(1, updateDto);

// Buscar com enhancement
const task = await recurringTaskService.findOne(1);
// task.templateData.occupations estará populado

// Listar com enhancement
const tasks = await recurringTaskService.findAll();
// Todas terão ocupações carregadas
```

## 🔗 Relacionamentos

### Many-to-One
- **user**: Usuário responsável
- **project**: Projeto relacionado

### One-to-Many
- **tasks**: Tarefas geradas por esta recorrente

### Dynamic Relations
- **occupations**: Via templateData.occupation_ids (enhanced)

## 🎭 Extensibilidade

### Nova Strategy de Criação
```typescript
export class UrgentRecurringTaskCreationStrategy implements RecurringTaskCreationStrategy {
  canHandle(dto: CreateRecurringTaskDto): boolean {
    return dto.templateData.priority === 'urgent';
  }

  create(dto: CreateRecurringTaskDto, repository: Repository<RecurringTask>): RecurringTask {
    // Regras especiais para tarefas urgentes
    return repository.create({
      ...dto,
      next_due_date: new Date(), // Executar imediatamente
      is_active: true,
      // ... lógica específica
    });
  }
}
```

### Novo Enhancer
```typescript
export class ProjectEnhancer implements RecurringTaskEnhancer {
  async enhance(task: RecurringTask): Promise<RecurringTask> {
    // Carregar informações adicionais do projeto
    if (task.projectId) {
      task.project = await this.projectRepository.findOne({
        where: { id: task.projectId },
        relations: ['details']
      });
    }
    return task;
  }
}
```

## ⚠️ Considerações

### Performance
- Enhancement é aplicado em todos os métodos de busca
- Batch enhancement otimizado para arrays
- Relations carregadas apenas quando necessário

### Template Data
- Occupation_ids são IDs, occupations são objetos completos
- Merge preserva occupation_ids existentes
- Datas relativas (+0d, +7d) para flexibilidade