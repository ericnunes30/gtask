# Módulo de User - Especificação

## Entidade User

A entidade User foi migrada do modelo AdonisJS original para TypeORM com os seguintes campos:

### Campos
- `id`: Primary key (auto incremento)
- `name`: Nome do usuário
- `email`: Email único do usuário  
- `password`: Senha (não serializada por padrão)
- `createdAt`: Data de criação
- `updatedAt`: Data de última atualização

### Relacionamentos
- `roles`: ManyToMany com Role (tabela pivot: users_roles)
- `occupations`: ManyToMany com Occupation (tabela pivot: users_occupations) 
- `projects`: ManyToMany com Project (tabela pivot: projects_users)
- `tasks`: ManyToMany com Task (tabela pivot: task_user)
- `recurringTasks`: OneToMany com RecurringTask
- `comments`: OneToMany com Comment

## Status da Migração
- ✅ Estrutura da entidade criada
- ⏳ Relacionamentos comentados (aguardando outras entidades)
- ⏳ Módulo precisa ser atualizado para usar nova entidade