# AGENTS.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com o código neste repositório.

## Estrutura do Projeto

Este é um aplicativo de gerenciamento de projetos full-stack com backend e frontend separados:

- **Backend**: API AdonisJS 6 (`/backend/`) - API de gerenciamento de tarefas e projetos com PostgreSQL e Typescript
- **Frontend**: React + Vite + TypeScript (`/frontend/`) - SPA moderno com componentes shadcn/ui

## Comandos de Desenvolvimento

### Backend (AdonisJS)
```bash
cd backend
npm run dev         # Iniciar servidor de desenvolvimento com HMR
npm run build       # Construir para produção
npm run test        # Executar testes com Japa
npm run lint        # Verificação ESLint
npm run typecheck   # Verificação de tipo TypeScript
node ace serve --watch      # Comando de desenvolvimento alternativo
node ace migration:run  # Executar migrações de banco de dados
node ace db:seed    # Popular banco de dados com dados de teste
```

### Frontend (React/Vite)
```bash
cd frontend
npm run dev         # Iniciar servidor de desenvolvimento Vite (porta 8080)
npm run build       # Construir para produção
npm run build:dev   # Construir em modo de desenvolvimento
npm run lint        # Verificação ESLint
npm run preview     # Visualizar build de produção
```

## Visão Geral da Arquitetura

### Arquitetura do Backend
- **Framework**: AdonisJS 6 com TypeScript
- **Banco de Dados**: PostgreSQL com Lucid ORM
- **Autenticação**: Tokens JWT Bearer via @adonisjs/auth
- **Estilo da API**: Recursos RESTful com rotas personalizadas adicionais
- **Modelos Chave**: User, Project, Task, Comment, Occupation, Role, ActivityLog
- **Caminhos de Importação**: Usa aliases `#` (ex: `#controllers/*`, `#models/*`)

### Arquitetura do Frontend
- **Framework**: React 18 + TypeScript
- **Ferramenta de Build**: Vite com SWC
- **Framework de UI**: Componentes shadcn/ui + primitivas Radix UI
- **Estilização**: Tailwind CSS com temas personalizados
- **Gerenciamento de Estado**: React Query (@tanstack/react-query) para estado do servidor
- **Roteamento**: React Router DOM
- **Cliente API**: Axios com interceptadores para autenticação e tratamento de erros

### Esquema do Banco de Dados
Principais relacionamentos:
- **Projetos** → muitas Tarefas, muitos-para-muitos com Usuários e Ocupações
- **Tarefas** → pertencem ao Projeto, muitos-para-muitos com Usuários e Ocupações, têm Comentários
- **Usuários** → muitos-para-muitos com Projetos/Tarefas/Funções, pertencem a uma Ocupação
- **Comentários** → hierárquicos (pai/respostas), pertencem à Tarefa e Usuário, têm Curtidas
- **ActivityLog** → rastreia alterações em Tarefas e ações de Comentários

### Estrutura da API
- URL Base: `http://localhost:3333`
- Autenticação: cabeçalho `Authorization: Bearer <token>`
- Todas as rotas protegidas agrupadas sob middleware de autenticação
- Rotas especiais: histórico de tarefas, curtidas/respostas de comentários, gerenciamento de sessão

## Detalhes Chave de Implementação

### Especificidades do Backend
- Usa controladores de recurso AdonisJS com ações personalizadas adicionais
- Sistema de log de atividades rastreia automaticamente as alterações de tarefas e ações de comentários
- Gerenciamento de sessão JWT via SessionController
- Banco de dados usa abordagem de migração consolidada (ver `20250509175800_consolidated_initial_schema.ts`)
- Configuração PM2 disponível para implantação em produção

### Especificidades do Frontend
- URL base da API configurada em `src/lib/api/axios.ts`
- Sistema de tema com persistência em localStorage
- Estrutura de componentes segue padrões shadcn/ui
- Implementação de quadro Kanban com arrastar e soltar (@dnd-kit)
- Rotas protegidas via AuthContext e wrapper ProtectedRoute
- Servidor de desenvolvimento configurado para compatibilidade com Docker (host: "::", polling: true)

### Configuração de Ambiente
- Backend requer conexão PostgreSQL via `.env`
- Frontend se conecta ao backend em `localhost:3333`
- Portas de desenvolvimento: Backend (3333), Frontend (8080 ou 8081)
- Ambos os projetos suportam padrões de variáveis de ambiente padrão
