# Manager Group Backend - Nova Arquitetura NestJS

Backend modular para sistema de gerenciamento de projetos e tarefas, migrado do AdonisJS para NestJS seguindo princípios SOLID e padrões de design.

## 🏗️ Arquitetura

### Princípios Aplicados

- **SOLID**: Aplicado em toda estrutura modular
- **Single Responsibility**: Cada módulo tem uma responsabilidade específica
- **Open/Closed**: Classes abertas para extensão, fechadas para modificação
- **Dependency Inversion**: Injeção de dependências via NestJS DI

### Padrões de Design Implementados

- **Strategy Pattern**: Diferentes estratégias de autenticação (JWT, Local)
- **Factory Pattern**: Criação de DTOs e entidades
- **Adapter Pattern**: Integração com TypeORM
- **Decorator Pattern**: Guards, interceptors e filters
- **Facade Pattern**: Services simplificam complexidade dos repositórios

## 📁 Estrutura Modular

```
src/
├── modules/
│   ├── auth/           # Autenticação e autorização
│   ├── user/           # Gerenciamento de usuários
│   ├── role/           # Roles e permissões
│   ├── occupation/     # Ocupações profissionais
│   ├── project/        # Gestão de projetos
│   ├── tasks/          # Gestão de tarefas
│   └── comment/        # Sistema de comentários
├── common/
│   ├── guards/         # Guards de autenticação
│   ├── interceptors/   # Interceptors globais
│   └── filters/        # Exception filters
└── main.ts            # Bootstrap da aplicação
```

### Módulos Principais

#### 🔐 Auth Module
- JWT Authentication
- Local Strategy
- Password hashing com bcrypt
- Guards para proteção de rotas

#### 👥 User Module
- CRUD completo de usuários
- Relacionamentos many-to-many com roles, occupations, projects, tasks
- Busca por email
- Atribuição de roles

#### 📋 Task Module
- Gestão completa de tarefas
- Timer integrado
- Status workflow: pendente → a_fazer → em_andamento → em_revisao → concluido
- Prioridades: baixa, media, alta, urgente
- Campos detalhados: video_url, useful_links, observations

#### 💬 Comment Module
- Comentários hierárquicos (threads)
- Sistema de likes
- Menções de usuários
- Relacionamento com tasks

#### 🏢 Project Module
- Gestão de projetos
- Relacionamentos com users, occupations, tasks
- Status e prioridades

## 🛠️ Tecnologias

- **NestJS**: Framework principal
- **TypeORM**: ORM para PostgreSQL
- **JWT**: Autenticação
- **class-validator**: Validação de DTOs
- **bcrypt**: Hash de senhas
- **PostgreSQL**: Banco de dados

## 🚀 Configuração e Execução

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações
```

### Configuração do Banco

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=sua-senha
DB_DATABASE=manager_team2
JWT_SECRET=sua-chave-secreta-jwt
```

### Executar

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod

# Testes
npm run test
npm run test:e2e
```

## 📚 API Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro
- `GET /api/v1/auth/profile` - Perfil do usuário
- `POST /api/v1/auth/verify` - Verificar token

### Usuários
- `GET /api/v1/users` - Listar usuários
- `POST /api/v1/users` - Criar usuário
- `GET /api/v1/users/:id` - Buscar usuário
- `PUT /api/v1/users/:id` - Atualizar usuário
- `DELETE /api/v1/users/:id` - Remover usuário
- `GET /api/v1/users/search/:email` - Buscar por email
- `POST /api/v1/users/:id/assign-roles` - Atribuir roles

### Tarefas
- `GET /api/v1/tasks` - Listar tarefas
- `POST /api/v1/tasks` - Criar tarefa
- `GET /api/v1/tasks/:id` - Buscar tarefa
- `PUT /api/v1/tasks/:id` - Atualizar tarefa
- `DELETE /api/v1/tasks/:id` - Remover tarefa
- `PATCH /api/v1/tasks/:id/timer` - Atualizar timer
- `POST /api/v1/tasks/:id/assign-users` - Atribuir usuários

### Projetos
- `GET /api/v1/projects` - Listar projetos
- `POST /api/v1/projects` - Criar projeto
- `GET /api/v1/projects/:id` - Buscar projeto
- `PUT /api/v1/projects/:id` - Atualizar projeto
- `DELETE /api/v1/projects/:id` - Remover projeto
- `GET /api/v1/projects/:id/tasks` - Tarefas do projeto

## 🔧 Ferramentas de Desenvolvimento

```bash
# Lint
npm run lint

# Format
npm run format

# Build
npm run build

# Testes com coverage
npm run test:cov
```

## 📈 Melhorias Implementadas

1. **Modularidade**: Arquitetura modular seguindo princípios SOLID
2. **Type Safety**: TypeScript strict mode
3. **Validação**: class-validator em todos os DTOs
4. **Interceptors**: Transformação global de respostas
5. **Exception Filters**: Tratamento unificado de erros
6. **Guards**: Proteção de rotas com JWT
7. **CORS**: Configurado para frontend
8. **Logging**: Logs de desenvolvimento e produção

## 🔄 Migração do AdonisJS

A migração foi realizada mantendo compatibilidade com:
- Estrutura de banco de dados
- Relacionamentos entre entidades
- Endpoints da API
- Funcionalidades existentes

### Melhorias na Nova Arquitetura

1. **Injeção de Dependências**: Melhor testabilidade
2. **Decorators**: Código mais limpo e declarativo
3. **Pipes**: Validação automática
4. **Interceptors**: Transformação de dados consistente
5. **Guards**: Autenticação/autorização padronizada

## 📝 Scripts NPM

```bash
# Desenvolvimento
npm run start:dev        # Inicia em modo desenvolvimento com watch
npm run start:debug      # Inicia em modo debug

# Build e Produção
npm run build           # Build da aplicação
npm run start:prod      # Inicia versão de produção

# Qualidade de Código
npm run lint            # ESLint
npm run format          # Prettier

# Testes
npm run test            # Testes unitários
npm run test:watch      # Testes em modo watch
npm run test:cov        # Testes com coverage
npm run test:e2e        # Testes end-to-end
```