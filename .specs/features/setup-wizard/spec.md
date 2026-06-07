# Feature: Setup Wizard (First-User Onboarding)

## Status: Specified ✅ | Design: ✅ | Tasks: ✅ | Implementation: Complete ✅

## Context

O sistema Manager Group é um gerenciador de projetos e tarefas open-source. Ao clonar e rodar o projeto pela primeira vez, não existe nenhum usuário no banco de dados. A página de login é exibida, mas não há como criar a primeira conta. Essa feature implementa o padrão open-source de "setup wizard" para criação da conta de administrador inicial.

## Prerequisites

Esta feature **depende** da feature **API Security Hardening** (`api-security-hardening/`) estar implementada. Especificamente, a Task T1 dessa outra feature (migration de seed de roles) é pré-requisito para que o setup possa atribuir a role `ADMIN` ao primeiro usuário.

## Problem Statement

- Ao clonar o projeto, não existe nenhum usuário no banco de dados
- A tela de login é exibida, mas não há como criar a primeira conta de administrador
- Não existe página de setup/registro no frontend
- Usuários novos ficam bloqueados na tela de login sem saber como proceder

## Scope

### In Scope ✅

1. Backend endpoint `GET /auth/setup-status` para detectar se setup é necessário
2. Backend endpoint `POST /auth/setup` para criar o primeiro usuário com role ADMIN
3. Aplicação do `SetupGuard` em `POST /auth/register` para fechar registro público após setup
4. Página `/setup` no frontend com formulário de primeira conta
5. Detecção de setup mode no boot do frontend (com cache local)
6. Transação transacional no TypeORM para evitar race conditions durante o setup

### Out of Scope ❌

- Proteção de endpoints com JWT (feature separada: `api-security-hardening`)
- Tela de "forgot password" (já existe placeholder no login)
- Convite de usuários por email
- Configurações de sistema adicionais (empresa, timezone etc.)
- Re-setup após conclusão
- Rate-limiting específico para setup (reutiliza ThrottlerModule global)

## User Stories

### P1: Setup Wizard — Detecção de Instalação Nova

**Como** desenvolvedor que acabou de instalar o app,
**Quero** que o sistema detecte automaticamente que não existe nenhum usuário,
**Para que** eu possa criar a primeira conta de administrador sem ficar travado na tela de login.

**Acceptance Criteria:**

1. **WHEN** o frontend inicia pela primeira vez em uma instalação nova **THEN** ele deve chamar `GET /auth/setup-status` e detectar `needsSetup: true`
2. **WHEN** o backend recebe `GET /auth/setup-status` **THEN** ele deve fazer `SELECT COUNT(*) FROM users` e retornar `{ needsSetup: count === 0 }`
3. **WHEN** o frontend detecta `needsSetup: true` **THEN** ele deve redirecionar automaticamente para `/setup` (substituindo a history, não empilhando)
4. **WHEN** o frontend detecta `needsSetup: false` **THEN** ele deve exibir a tela de login normalmente
5. **WHEN** o resultado de `setup-status` é `needsSetup: false` **THEN** o frontend deve salvar no `localStorage` a chave `setup_status_v1` com TTL de 24h, para evitar chamadas repetidas
6. **WHEN** o usuário acessa `/setup` e o `setup-status` retorna `needsSetup: false` **THEN** ele deve ser redirecionado para `/login`

### P1: Setup Wizard — Criação da Primeira Conta

**Como** administrador configurando o sistema pela primeira vez,
**Quero** preencher um formulário simples com nome, email e senha,
**Para que** a conta seja criada automaticamente com permissões administrativas.

**Acceptance Criteria:**

1. **WHEN** o usuário acessa `/setup` **THEN** deve ver uma página de boas-vindas com o título "Bem-vindo ao Manager Group" e formulário de criação de conta
2. **WHEN** o formulário é submetido **THEN** o frontend deve chamar `POST /auth/setup` com `{ name, email, password }`
3. **WHEN** o backend recebe `POST /auth/setup` com `userCount === 0` **THEN** deve criar o usuário dentro de uma transação TypeORM, atribuir a role `ADMIN` automaticamente (pré-requisito: migration de seed de `ADMIN` role), e retornar `{ accessToken, refreshToken, user }`
4. **WHEN** o primeiro usuário é criado com sucesso **THEN** o frontend deve salvar os tokens no localStorage, atualizar o authStore e redirecionar para `/projects`
5. **WHEN** `POST /auth/setup` é chamado com `userCount > 0` **THEN** deve retornar `403 Forbidden` com `{ message: 'Setup already completed. Please login.' }`
6. **WHEN** o usuário acessa `/setup` e já existe algum usuário **THEN** o frontend deve redirecionar automaticamente para `/login`
7. **WHEN** dois usuários tentam setup simultaneamente **THEN** apenas o primeiro sucede; segundo recebe `403 Setup already completed` (via transação TypeORM com `QueryRunner`)

### P1: Segurança — Fechamento de Registro Público

**Como** desenvolvedor,
**Quero** garantir que o registro público seja desabilitado após o setup,
**Para que** não exista um buraco de segurança permanente.

**Acceptance Criteria:**

1. **WHEN** `POST /auth/register` é chamado em um sistema com `userCount === 0` **THEN** permite criação (para compatibilidade com scripts externos)
2. **WHEN** `POST /auth/register` é chamado em um sistema com `userCount > 0` **THEN** retorna `403 Forbidden` com `{ message: 'Registration is closed. Contact an administrator.' }`
3. **WHEN** `POST /auth/setup` é chamado com `userCount > 0` **THEN** retorna `403 Forbidden`

### P2: UX — Cache de Status no Frontend

**Como** usuário,
**Quero** que o frontend não faça chamadas desnecessárias ao backend para checar setup,
**Para que** a navegação seja mais rápida.

**Acceptance Criteria:**

1. **WHEN** o frontend já verificou `setup-status` e salvou `needsSetup: false` no `localStorage` **THEN** ele não deve chamar `GET /auth/setup-status` novamente durante 24h
2. **WHEN** o TTL de 24h expira ou o valor não existe no `localStorage` **THEN** o frontend deve chamar `GET /auth/setup-status` novamente no próximo acesso à página pública (`/login` ou `/setup`)
3. **WHEN** o usuário faz logout **THEN** o cache de `setup-status` deve continuar válido (não limpar no logout)

## Non-Functional Requirements

### Performance
- `GET /auth/setup-status` deve responder em <50ms (é um `SELECT COUNT(1)` simples)
- Cache local no frontend deve reduzir chamadas em ~95% dos reloads de página

### Security
- `POST /auth/setup` reutiliza o ThrottlerModule global (100 req/min)
- Após setup, `POST /auth/register` e `POST /auth/setup` são permanentemente fechados
- Senha do primeiro usuário deve seguir a mesma validação do `RegisterDto` (`minlength: 6`)

### Accessibility
- Página `/setup` deve ser acessível via teclado completo
- Formulário deve usar labels corretamente associados aos inputs
- Mensagens de erro devem ser anunciadas por screen readers (toast/alert)

## Error Scenarios

| # | Scenario | Expected Result |
|----|----------|----------------|
| E1 | Backend cai durante `GET /auth/setup-status` | Frontend mostra erro genérico "Não foi possível conectar ao servidor" e permite retry |
| E2 | `POST /auth/setup` com email já existente (race condition) | Retorna `409 Conflict` "Email already in use" |
| E3 | `POST /auth/setup` com payload inválido | Retorna `400 Bad Request` com erros de validação (mesmo formato do `RegisterDto`) |
| E4 | Dois usuários tentam setup simultaneamente | Apenas o primeiro sucede; segundo recebe `403 Setup already completed` |
| E5 | Usuário navega direto para `/setup` após setup completo | Redireciona para `/login` |

## Data Models

### SetupStatusResponse (Backend → Frontend)
```json
{
  "needsSetup": true
}
```

### SetupRequest (Frontend → Backend)
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "min6chars"
}
```

### SetupResponse (Backend → Frontend)
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "roles": [{"id": 1, "name": "ADMIN"}]
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

## UI/UX Reference

- **Inspiração**: Páginas de setup do GitLab, Nextcloud, WordPress (`wp-admin/install.php`)
- **Layout**: Página dedicada em tela cheia, centrada, com o mesmo visual design system do app (Card, Input, Button do shadcn/ui)
- **Copy sugerida**:
  - Título: "Bem-vindo ao Manager Group"
  - Subtítulo: "Configure sua conta de administrador para começar"
  - Botão: "Criar conta e entrar"
  - Footer: "Já tem uma conta? Entrar" (redireciona para `/login`)

## Dependencies

### Technical
- NestJS: `@nestjs/common`, `@nestjs/passport`, `class-validator`, `typeorm`
- React: `react-router-dom`, `zustand`, `react-hook-form`, `zod`, `axios`
- Database: tabela `roles` com role `ADMIN` já seedada (pré-requisito externo)

### Existing Code Reuse
- `backend/src/modules/auth/` — reuse DTOs, token signing
- `backend/src/modules/user/` — reuse `UserService.create()`, `UserEntity`
- `backend/src/modules/role/` — reusa `RoleEntity` (role `ADMIN` já existe via migration seed — ver `api-security-hardening`)
- `frontend/src/pages/Login.tsx` — reuse visual pattern (Card, Input, Button)
- `frontend/src/stores/authStore.ts` — reuse token handling
- `frontend/src/services/backend/auth/` — reuse api patterns

## External Dependencies

### Pre-requisite Feature: `api-security-hardening`
- **Migration T1** (`SeedDefaultRoles`): garante que a role `ADMIN` existe antes do setup
- Sem essa migration, o setup falha ao tentar atribuir `ADMIN` a um usuário inexistente

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Race condition: dois setups simultâneos | Medium | High | Transação transacional no banco (`QueryRunner`) + check `COUNT(*)` antes de INSERT |
| `setup-status` chamado DDoS-style | Low | Medium | NestJS Throttler já ativo globalmente (100 req/min) |
| Cache local stale após reset de banco | Low | Low | TTL de 24h naturalmente expira; manualmente o usuário pode limpar localStorage |
| Role `ADMIN` não existe durante setup | High | High | **Solved by pre-requisitefeature `api-security-hardening` migration T1** |

## Notes

- O endpoint `POST /auth/register` mantém compatibilidade com scripts de automação em instalação nova (quando `userCount === 0`, permite). Depois do setup, fecha via `SetupGuard`.
- O frontend deve chamar `GET /auth/setup-status` APENAS em rotas públicas (`/login`, `/setup`), nunca em rotas protegidas (evita flash de redirecionamento).
- A transação TypeORM usa `QueryRunner` para garantir atomicidade: se o INSERT de `users` sucede mas o INSERT de `user_roles` falha, tudo é rollback.
