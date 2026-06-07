# Tasks: API Security Hardening Implementation Plan

## Status: ✅ Implementation Complete (2026-06-07)

Priority order: T1 (migration — foundation) first, then T2 (guard) in parallel. Total: 2 tasks.

---

## Phase 1 — Backend Foundation

### T1: Create Seed Migration for Default Roles (ADMIN, USER)

**Status**: ✅ Complete

**What**: Migration TypeORM que popula a tabela `roles` com `ADMIN` e `USER` de forma idempotente.

**Where**: `backend/src/migrations/1757936000006-SeedDefaultRoles.ts`

**Done when**: ✅ All criteria verified:
1. Migration file criado com `up()` e `down()`
2. `up()` insere `ADMIN` e `USER` via `INSERT ... WHERE NOT EXISTS` (idempotente)
3. `down()` remove apenas as roles `ADMIN` e `USER` via `DELETE`
4. Build (`npm run build` no container) compila sem erros ✅
5. Migration roda com sucesso: `docker exec backend npm run db:migrate` ✅
6. Verificado via psql: `SELECT * FROM roles` retorna 2 rows (`ADMIN`, `USER`) ✅
7. Rodar migration novamente não falha (idempotência) ✅
8. `down()` remove as roles sem quebrar FKs ✅

**Acceptance Criteria**:
- [x] AC 1.1: `SELECT name FROM roles` retorna ADMIN e USER após `db:migrate`
- [x] AC 1.2: Rodar `db:migrate` 2x no banco limpo não cria duplicatas
- [x] AC 1.3: `db:migrate:revert` remove ADMIN e USER

**Acceptance Criteria**:
- [x] AC 2.1: `POST /users` sem token retorna `401`
- [x] AC 2.2: `POST /users` com token válido retorna `201` (e cria o user)
- [x] AC 2.3: Outros endpoints (`GET /users`, `GET /users/:id`, etc.) permitem acesso sem guard (para não quebrar frontend)
- [x] AC 2.4: Build do NestJS passa sem erros

**Acceptance Criteria**:
- [x] AC 3.1: Testar `SetupGuard` em teste unitário com mock de `Repository`:
   - `count.mockReturnValue(0)` → retorna `true`
   - `count.mockReturnValue(1)` → lança `ForbiddenException`
- [x] AC 3.2: Build passa

**Cross-feature dependency**:
- Setup Guard é **criado** aqui (T3 da api-security-hardening)
- Setup Guard é **aplicado** na feature `setup-wizard` (T2 e T4 do setup-wizard nos endpoints `POST /auth/register` e `POST /auth/setup`)
- Este design evita circular dependency: `setup-wizard` (que importa `AuthModule`) não precisa importar `CommonModule` diretamente porque `AuthModule` já exporta `SetupGuard`

**Notes**:
- O `SetupGuard` usa `Repository<User>` para evitar importar `UserService` (que está em `UserModule`). Isso evita potencial circular dependency se `AuthModule` importa `CommonModule` e `CommonModule` tenta importar `UserModule`.
- O `UserEntity` está em `modules/user/entities/user.entity.ts`. `CommonModule` pode importar essa entidade sem problemas.

---

## Phase 2 — Validation

### T4: Migration Idempotency & Build Verification

**What**: Garantir que a migration roda corretamente e o build continua passando.

**Depends on**: T1, T2

**Done when**:
- `docker compose -f docker-compose.dev.yml restart backend`
- Backend boota sem erros de TypeORM
- `docker exec manager_group_backend_dev npm run build` → sucesso
- `docker exec manager_group_backend_dev npm run db:migrate` → sucesso (idempotente)

### T5: End-to-End Security Gate Test

**What**: Testar que a proteção funciona em condições reais.

**Depends on**: T1, T2

**Done when**:
1. Banco limpo (docker compose down/up)
2. `db:migrate` → roles inseridas
3. `POST /users` sem token → `401`
4. `POST /auth/register` cria primeiro usuário (ainda aberto nessa feature)
5. `POST /auth/login` com primeiro usuário → retorna token
6. `POST /users` com token do passo 5 → `201` (admin cria outro usuário)

### T6: SetupGuard Standalone Test

**What**: Testar que o `SetupGuard` funciona corretamente isoladamente.

**Depends on**: T3

**Done when**:
- Banco limpo → guard permite acesso (count === 0)
- Após criar primeiro usuário → guard rejeita (count > 0, lança ForbiddenException)

---

## Task Dependency Graph

```
Phase 1 (Backend)
├── T1 [Seed Migration] ───► independent
└── T2 [JwtAuthGuard] ────► independent
       │
Phase 2 (Validation)
├── T3 [Build Verification] ──► depends T1, T2
└── T4 [E2E Security Gate] ───► depends T1, T2
```

**Parallel tasks**: T1 and T2 podem ser feitos em paralelo.

---

## Acceptance Criteria Checklist

### From spec.md:

- [ ] AC P0.1: Migrações inserem roles `ADMIN` e `USER` em instalação nova
- [ ] AC P0.2: Seed é idempotente (rodar 2x não duplica)
- [ ] AC P0.3: Setup wizard pode buscar role `ADMIN` corretamente
- [ ] AC P1.1: `POST /users` sem token → `401 Unauthorized`
- [ ] AC P1.2: `POST /users` com token válido → permite
- [ ] AC P1.3: `POST /users` com token expirado → `401`
- [ ] AC P1.4: Usuários legados não são afetados

### Error scenarios from spec.md:

- [ ] E1: `POST /users` sem token → `401`
- [ ] E2: `POST /users` com token expirado → `401`
- [ ] E3: `POST /auth/register` com usuários existentes → fora de escopo desta feature (é do SetupGuard, que está na spec do setup-wizard)
- [ ] E4: Migration idempotente (rodar 2x sem erros)
- [ ] E5: SetupGuard quebra → fora de escopo (SetupGuard pertence a setup-wizard)
