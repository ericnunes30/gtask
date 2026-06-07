# Feature: API Security Hardening (Guards & Role Seeding)

## Status: Specified ✅ | Design: ✅ | Tasks: ✅ | Implementation: Complete ✅

## Context

O sistema Manager Group possui endpoints críticos abertos sem autenticação ou proteção de setup. Isso representa um buraco de segurança permanente se não for corrigido antes do primeiro deploy público. Esta feature corrige isso adicionando guards JWT onde faltam e garantindo que o sistema tenha roles padrão (`ADMIN`, `USER`) no banco desde o primeiro boot.

## Problem Statement

- `POST /users` está aberto — qualquer pessoa pode criar usuários sem autenticação
- `POST /auth/register` fica permanentemente aberto após setup
- Não existe nenhum usuário após migrações, e não existe role `ADMIN` para atribuir ao primeiro usuário
- Setup wizard depende de uma role `ADMIN` existente, mas não há mecanismo para criá-la automaticamente

## Scope

### In Scope ✅

1. Migration de seed de roles padrão (`ADMIN`, `USER`)
2. Aplicação de `JwtAuthGuard` em `POST /users` para fechar criação pública de usuários
3. **Criação do `SetupGuard`** — guard genérico que permite acesso a um endpoint **apenas** quando `userCount === 0` (será aplicado em `POST /auth/register` e `POST /auth/setup` pela feature setup-wizard, mas o guard em si é implementado aqui)
4. Garantir que endpoints existentes de autenticação (`/auth/login`, `/auth/register`, `/auth/refresh`) continuem operacionais

### Out of Scope ❌

- Página de registro no frontend (não existe)
- RBAC granular (verificar se user é admin) — apenas garantir autenticação
- Rate limiting específico por endpoint (ThrottlerModule global já existe)
- Alterações no frontend (feature separada: Setup Wizard)

## User Stories

### P0: Seed de Roles Padrão

**Como** sistema,
**Quero** que as roles `ADMIN` e `USER` existam no banco desde o primeiro boot,
**Para que** o setup wizard possa atribuir `ADMIN` ao primeiro usuário.

**Acceptance Criteria:**

1. **WHEN** as migrações TypeORM rodam em uma instalação nova **THEN** as roles `ADMIN` e `USER` devem ser inseridas automaticamente na tabela `roles`
2. **WHEN** as migrações rodam em uma instalação existente **THEN** o seed deve ser idempotente (não duplicar roles)
3. **WHEN** o setup wizard cria o primeiro usuário **THEN** ele pode buscar a role `ADMIN` por `name: "ADMIN"` e atribuí-la com segurança

### P0: Proteção de Criação de Usuários

**Como** desenvolvedor,
**Quero** que `POST /users` requeira autenticação JWT,
**Para que** usuários anônimos não possam criar contas arbitrariamente.

**Acceptance Criteria:**

1. **WHEN** `POST /users` é chamado sem header `Authorization: Bearer <token>` **THEN** retorna `401 Unauthorized`
2. **WHEN** `POST /users` é chamado com token JWT válido **THEN** permite criação normalmente
3. **WHEN** `POST /users` é chamado com token expirado **THEN** retorna `401 Unauthorized`
4. **GIVEN** que usuários legados podem já existir **THEN** nenhum dado existente é afetado — apenas guards adicionados

### P1: Guard de Setup

**Como** desenvolvedor,
**Quero** que `POST /auth/register` seja fechado após o primeiro usuário ser criado,
**Para que** não exista buraco de segurança de registro público permanente.

**Acceptance Criteria:**

1. **WHEN** `POST /auth/register` é chamado em sistema com 0 usuários **THEN** permite criação (para compatibilidade/scripting)
2. **WHEN** `POST /auth/register` é chamado em sistema com >0 usuários **THEN** retorna `403 Forbidden`
3. **WHEN** `POST /auth/setup` é chamado em sistema com >0 usuários **THEN** retorna `403 Forbidden`
4. **WHEN** `POST /auth/login` é chamado **THEN** sempre funciona, independentemente de setup status

## Non-Functional Requirements

### Security
- `POST /users` requer JWT válido
- `POST /auth/register` requer `userCount === 0`
- Nenhuma senha é exposta em logs ou responses

### Performance
- `SetupGuard` deve usar cache (ou `COUNT(1)` com índice) para não adicionar latência perceptível
- `JwtAuthGuard` já é padrão do Passport — sem overhead adicional

## Error Scenarios

| # | Scenario | Expected Result |
|----|----------|----------------|
| E1 | `POST /users` sem token | `401 Unauthorized` |
| E2 | `POST /users` com token expirado | `401 Unauthorized` |
| E3 | `POST /auth/register` com usuários existentes | `403 Forbidden` |
| E4 | Migration de seed falha (roles já existem) | Migration deve ser idempotente (skip insert) |
| E5 | `SetupGuard` falha ao contar usuários | `500 Internal Server Error` (erro de infra) |

## Data Models

### RoleEntity (existente)
```typescript
@Entity('roles')
class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
```

### Seed Migration
```typescript
export class SeedDefaultRoles1717789200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (name, created_at, updated_at)
      VALUES ('ADMIN', NOW(), NOW()), ('USER', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM roles WHERE name IN ('ADMIN', 'USER');
    `);
  }
}
```

## Dependencies

### Technical
- NestJS: `@nestjs/common`, `@nestjs/passport`, `passport`, `passport-jwt`, `typeorm`
- Banco: PostgreSQL com tabela `users` e `roles` existentes

### Existing Code Reuse
- `backend/src/modules/auth/guards/jwt-auth.guard.ts` — já existe, aplicar no controller
- `backend/src/modules/user/controllers/user.controller.ts` — adicionar `@UseGuards(JwtAuthGuard)`
- `backend/src/migrations/` — adicionar migration de seed
- `backend/src/modules/user/` — reutilizar `UserService.count()`

## External Dependencies

- Setup Wizard depende desta feature (especificamente migration T1: seed de roles)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Breaking change: frontend não envia token | Medium | High | Verificar primeiro se frontend já envia token em chamadas autenticadas. Como não existe tela de criação de usuário no frontend, o impacto é zero para usuários finais. |
| Migration falha em produção | Low | High | Migration usa `ON CONFLICT DO NOTHING` — idempotente |
| `SetupGuard` quebra login | Low | High | `SetupGuard` NÃO é aplicado em `/auth/login` ou `/auth/refresh` |

## Notes

- Esta feature é **pré-requisito** do Setup Wizard. Sem o seed de roles, o setup wizard falha ao tentar atribuir `ADMIN` ao primeiro usuário.
- A ordem de deployment deve ser: (1) deploy desta feature com migration, (2) deploy do Setup Wizard.
- `POST /auth/register` deve manter compatibilidade em instalações novas (0 usuários) para scripts. Após setup, fecha.
