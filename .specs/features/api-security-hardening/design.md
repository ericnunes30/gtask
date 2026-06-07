# Design: API Security Hardening (Guards & Role Seeding)

## Overview

Este documento detalha a arquitetura técnica para fechar o buraco de segurança crítico no endpoint `POST /users` (criação pública de usuários sem autenticação) e garantir que as roles padrão (`ADMIN`, `USER`) existam no banco via migration de seed antes do primeiro setup.

## Architecture Principles

1. **Fail-safe**: Se a migration de seed falhar, o sistema deve logar o erro mas não travar o boot.
2. **Idempotent**: A migration de seed deve rodar seguras múltiplas vezes sem duplicar dados.
3. **Surgical**: Mínima mudança no código existente — apenas adicionar guard onde falta.
4. **Zero breaking change**: Frontend já não tem tela de criação de usuários, então proteger `POST /users` não quebra nada.

## System Architecture

### Flow Diagram: Request Hardening

```
Request POST /users
       |
       ▼
┐─────────────────────────────╖
║ JwtAuthGuard (global APP_GUARD)   ║
└─────────────────────────────╜
       |  Sem header Authorization
       ─────────────────────────────────▶ 401 Unauthorized
       |  Com token válido
       ▼
   UserController.create()
       ▼
   UserService.create()
```

### Flow Diagram: Database Seed

```
TypeORM Migrations
       |
       ▼
┐─────────────────────────────╖
║ SeedDefaultRolesMigration         ║
║   ON CONFLICT (name) DO NOTHING   ║
║   VALUES ('ADMIN', 'USER')         ║
└─────────────────────────────╜
       |
       ▼
   roles table pronta para setup
```

## Backend Design

### Decision: Global `JwtAuthGuard` vs. Per-Method Guard

O projeto já tem `JwtAuthGuard` em `backend/src/common/guards/jwt-auth.guard.ts`. Existem duas abordagens:

**Opção A: APP_GUARD global (binding em AppModule)**
- Registra `JwtAuthGuard` como `APP_GUARD` em `AppModule.providers`, como o `ThrottlerGuard` já é.
- Isso protege TODOS os endpoints por padrão.
- Precisaria marcar `@Public()` ou `@SkipAuth()` nos endpoints abertos (`/auth/login`, `/auth/register`, `/auth/refresh`, `GET /auth/setup-status`, `POST /auth/setup`).

**Opção B: Per-method guard (escolhida)**
- Adiciona `@UseGuards(JwtAuthGuard)` apenas em `POST /users`.
- Menos invasivo — não quebra rotas existentes.
- Permite aplicar aos outros endpoints gradualmente.
- **Rationale**: O projeto não tem o pattern de `@Public()` decorador. Mudar para APP_GUARD iria exigir refatoração de todos os controllers. Manter per-method é mais seguro neste momento.

### Decision: Migration de Seed (TypeORM)

**Por que migration e não factory/seeder?**
- TypeORM CLI `migration:run` já está configurado no `package.json` (corrigimos para `dist/console.js`)
- Migrations são transacionais por padrão
- Faz parte da pipeline de deploy (banco novo = migrações + seed em uma única transação)
- Factory/seeder exigiria comando separado (`npm run seed`)

**Idempotência**: Usar `INSERT ... ON CONFLICT (name) DO NOTHING` do PostgreSQL. Isso:
- Não falha se roles já existem
- Não duplica dados
- Requer a constraint `UNIQUE` na coluna `name` da tabela `roles` (já existe: `@Column({ type: 'varchar' })` — mas NÃO é `unique: true` na entity. Vamos verificar: `RoleEntity` usa `@Column({ type: 'varchar' })` sem `unique: true`. Precisamos garantir que `name` é unique via migration ou é já unique no banco?)

**Verificação de unique constraint**: A entity `Role` não tem `unique: true` no `@Column`. No design do setup-wizard, eu assumi que `ON CONFLICT` funcionaria. Vou usar `SELECT` + condicional para idempotência em vez de `ON CONFLICT`, para não depender de unique constraint no banco. Ou melhor, vou usar o pattern de TypeORM `queryRunner.query()` com subquery para idempotência.

**Padrão TypeORM idempotente**:
```typescript
await queryRunner.query(`
  INSERT INTO roles (name, created_at, updated_at)
  SELECT 'ADMIN', NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');
`);
```

### Modified Endpoints

| Endpoint | Change | Rationale |
|----------|--------|-----------|
| `POST /users` | Add `@UseGuards(JwtAuthGuard)` | Fecha criação pública de usuários |

### Implementation Plan: Backend

#### 1. UserController (modified)

Local: `backend/src/modules/user/controllers/user.controller.ts`

**Current state**: Nenhum guard aplicado. `@Post()` aberto.

**Change**: Adicionar imports e decorador:

```typescript
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard'; // absolute path ou relative

@Controller('users')
export class UserController {
  // ... other methods ...

  @Post()
  @UseGuards(JwtAuthGuard)  // NEW
  create(@Body() createUserDto: CreateUserDto) {
    // ... existing logic ...
  }
}
```

**Note**: Mantém outros endpoints (`GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`) sem guard por enquanto para não quebrar o frontend. O foco é APENAS fechar o endpoint de criação.

#### 2. Seed Migration (new)

Local: `backend/src/migrations/[timestamp]-SeedDefaultRoles.ts`

Timestamp naming convention: Existing migrations use format `1757936000000`, `1757936000001`, etc. Use next sequential number or TypeORM timestamp.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultRoles1757936000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: only inserts if not exists
    await queryRunner.query(`
      INSERT INTO roles (name, description, created_at, updated_at)
      SELECT 'ADMIN', 'System Administrator', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');
    `);
    await queryRunner.query(`
      INSERT INTO roles (name, description, created_at, updated_at)
      SELECT 'USER', 'Standard User', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'USER');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM roles WHERE name IN ('ADMIN', 'USER');`);
  }
}
```

**Rationale**: `WHERE NOT EXISTS` é idempotente sem exigir unique constraint. Duas queries separadas para clareza (uma por role).

**Column names**: A tabela `roles` tem colunas `name`, `description`, `created_at`, `updated_at` (mapeadas pela `RoleEntity`). Não tem `deleted_at` no schema real — `DeleteDateColumn` é nullable. Omitimos no INSERT.

#### 3. New `SetupGuard`

Local: `backend/src/common/guards/setup.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';

@Injectable()
export class SetupGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const count = await this.userRepository.count();
    if (count === 0) return true;
    throw new ForbiddenException('Setup completed. Registration is closed.');
  }
}
```

**Registration**: O `SetupGuard` precisa estar disponível para `AuthModule`. Opções:
1. Criar `CommonModule` e exportar (se não existir)
2. Registrar `SetupGuard` como provider no `AppModule` + `@Inject(forwardRef(() => ...))`

**Opção escolhida**: Registrar no `AuthModule` como provider (já que é guard de auth). Mas `AuthModule` não tem `User` entity. Solução: `CommonModule` com `TypeOrmModule.forFeature([User])`.

```typescript
// backend/src/common/common.module.ts (novo)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/user/entities/user.entity';
import { SetupGuard } from './guards/setup.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [SetupGuard],
  exports: [SetupGuard],
})
export class CommonModule {}
```

Importar `CommonModule` no `AuthModule`:
```typescript
// backend/src/modules/auth/auth.module.ts
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    CommonModule, // NEW: SetupGuard + UserRepository
    UserModule,
    // ...
  ],
})
```

**Rationale**: `SetupGuard` usa `Repository<User>` para `COUNT(1)`. TypeORM `@InjectRepository` exige o `TypeOrmModule.forFeature([User])` no módulo que declara o guard. Colocar em `CommonModule` evita circular dependency.

**NÃO aplicar `SetupGuard` nesta feature**: O guard é criado aqui, mas só aplicado em `POST /auth/register` e `POST /auth/setup` pela feature `setup-wizard`. Nesta feature, ele é apenas "criado e exportado".

#### 4. Running the Migration

```bash
docker compose -f docker-compose.dev.yml up -d backend
docker exec manager_group_backend_dev npm run db:migrate
```

Migration filename must be registered in `ormconfig` or picked up by glob. The app.module.ts uses:
```typescript
migrations: ['dist/migrations/*.js'],
```

So new file must be compiled and placed in `dist/migrations/`.

### Database Operations

| Query | Purpose | Frequency |
|-------|---------|-----------|
| `INSERT ... WHERE NOT EXISTS` | Seed roles no boot | 1x por instalação |
| `SELECT * FROM roles WHERE name = 'ADMIN'` | Setup wizard busca role | 1x no setup |
| `COUNT(1) FROM users` | Setup guard | 1x por request protegido |

## Frontend Design

Nesta feature, **não há mudanças no frontend**. Todas as mudanças são backend-only. A proteção de `POST /users` não quebra nada porque o frontend não tem nenhuma tela que chame esse endpoint diretamente (apenas o Admin gerencia usuários, e isso é via outro endpoint ou tela ainda não implementada).

## Test Strategy

### Backend Tests

| Test | Type | Where |
|------|------|-------|
| Migration up insere roles em banco limpo | Unit/Integration | `migrations/seed-roles.spec.ts` (opcional) |
| Migration up é idempotente (rodar 2x) | Unit/Integration | Mesmo file |
| `POST /users` sem token retorna 401 | E2E | `users.e2e-spec.ts` |
| `POST /users` com token válido retorna 201 | E2E | `users.e2e-spec.ts` |
| `POST /users` com token expirado retorna 401 | E2E | `users.e2e-spec.ts` |

### Manual Validation

1. `curl -X POST http://localhost:8081/users ...` sem header `→` 401
2. `curl -X POST ...` com `Authorization: Bearer <token>` `→` 201
3. `docker exec ... npm run typeorm migration:run` `→` roles inseridas
4. Rodar migration novamente `→` idempotente, nenhum erro

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | `JwtAuthGuard` por método em `POST /users`, não global | Não tem pattern `@Public()` no projeto; mudar para APP_GUARD faria quebrar todas as rotas públicas. |
| D2 | Migration TypeORM para seed de roles | Migrations já estão na pipeline de deploy; factory/seeder exigiria comando manual extra. |
| D3 | `WHERE NOT EXISTS` em vez de `ON CONFLICT` | A coluna `name` da entity `Role` não tem `unique: true`; idempotência via `WHERE NOT EXISTS` é mais safe. |
| D4 | Apenas `POST /users` recebe guard nesta feature | Outros endpoints do UserController (GET, PUT, DELETE) não têm tela no frontend que os chame diretamente; protegê-los agora seria over-engineering e poderia quebrar funcionalidade existente. |
| D5 | Roles seeded: ADMIN + USER | USER é seedado para futura funcionalidade; já que estamos fazendo migration de seed, incluir ambos evita migration extra depois. |

## Open Questions

1. **A tabela `roles` tem uma coluna `deleted_at` no schema real?** Se o TypeORM gerou sem soft delete na tabela real, o INSERT pode ser mais simples. Verificar schema via `\d roles` no psql.
2. **O frontend chama `POST /users` em algum lugar?** Pesquisar: grep por `"/users"` no frontend. Se não encontrar, a mudança é zero-breaking.
3. **Os outros endpoints do UserController devem ter guard também?** Decision D4 diz não nesta feature. Se o usuário quiser proteger todos os endpoints de users, isso vai para uma feature futura de RBAC.

## Files Changed Summary

### Backend (new files)
- `backend/src/common/common.module.ts`
- `backend/src/common/guards/setup.guard.ts`
- `backend/src/migrations/1757936000006-SeedDefaultRoles.ts`

### Backend (modified files)
- `backend/src/modules/user/controllers/user.controller.ts`
- `backend/src/app.module.ts` (import CommonModule)
- `backend/src/modules/auth/auth.module.ts` (import CommonModule)

### Frontend
- Nenhuma mudança.

## Dependency Graph

```
Phase 1 (Backend)
├── T1 [Seed Migration] ───► independent
├── T2 [JwtAuthGuard em POST /users] ───► independent
└── T3 [SetupGuard + CommonModule] ───► independent

Phase 2 (Validation)
├── T4 [Build & Migration Verification] ───► depends T1, T2
├── T5 [E2E Security Gate] ───► depends T1, T2
└── T6 [SetupGuard Standalone Test] ───► depends T3
```

Task T1, T2, T3 podem ser implementados em paralelo. A migration T1 deve rodar antes do setup wizard.
