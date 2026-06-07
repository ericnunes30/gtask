# Tasks: Setup Wizard Implementation Plan

## Status: ✅ Implementation Complete (2026-06-07)

Priority order: backend independent tasks first, then frontend (some frontend tasks block on backend completion but not all).

---

## Phase 1 — Backend Foundation

### T1: Create `SetupDto`
**What**: DTO para validar payload do setup.
**Where**: `backend/src/modules/auth/dto/setup.dto.ts` (new)
**Reuses**: Pattern de `RegisterDto` (campos `name`, `email`, `password`)
**Depends on**: Nothing
**Done when**:
- DTO criado com validação class-validator: `@IsString`, `@MinLength(2)`, `@MaxLength(255)`, `@IsEmail`, `@MinLength(6)`
- Build (`npm run build`) sem erros de TypeScript

### T2: Create `SetupGuard`
**What**: Guard que permite acesso a `POST /auth/register` e `POST /auth/setup` **apenas** quando `userCount === 0`.
**Where**: `backend/src/common/guards/setup.guard.ts` (new)
**Reuses**: Injeta `UserService` existente
**Depends on**: Nothing
**Done when**:
- Guard implementa `CanActivate`
- Retorna `true` se `await userService.count() === 0`
- Lança `ForbiddenException('Registration is closed.')` se `count > 0`
- Unit test: permite quando count=0, rejeita quando count=1
- Adicionado ao `CommonModule` exports (ou provider no `AuthModule`)

### T3: Add `count()` to `UserService`
**What**: Método para contar usuários (usado por setup-status e SetupGuard).
**Where**: `backend/src/modules/user/services/user.service.ts` (modify)
**Reuses**: Existing `userRepository`
**Depends on**: Nothing
**Done when**:
- `async count(): Promise<number>` retorna `await this.userRepository.count()`
- Build sem erros

### T4: Implement `POST /auth/setup` & `GET /auth/setup-status`
**What**: Dois endpoints no auth controller para detecção e execução do setup.
**Where**: `backend/src/modules/auth/controllers/auth.controller.ts` (modify)
**Reuses**: `AuthService`, `SetupDto`
**Depends on**: T1, T2, T3
**Done when**:
- `GET /auth/setup-status` → retorna `{ needsSetup: boolean }` via `AuthService.checkSetupStatus()`
- `POST /auth/setup` → recebe `SetupDto`, retorna `{ user, accessToken, refreshToken }` via `AuthService.setupFirstUser()`
- `POST /auth/register` decorado com `@UseGuards(SetupGuard)`
- Testado manualmente via curl ou dev container

### T5: Implement `AuthService.checkSetupStatus()` e `AuthService.setupFirstUser()` + `UserService.createFirstAdmin()`

**What**: Lógica de negócio para detectar setup e criar primeiro usuário admin via transação transacional.

**Where**:
- `backend/src/modules/auth/services/auth.service.ts` (modify)
- `backend/src/modules/user/services/user.service.ts` (modify)

**Reuses**: `UserService.count()`, `UserService.create()`, `TokenPayloadFactory`, `JwtService`

**Depends on**: T3 (count), **Pre-requisite: api-security-hardening T1** (migration seed de roles)

**Done when**:
- `checkSetupStatus()` → `SELECT COUNT(1) FROM users` → retorna `{ needsSetup: count === 0 }`
- `UserService.createFirstAdmin()`:
  1. Cria `QueryRunner`, conecta, inicia transação
  2. `COUNT` dentro da transação → `ForbiddenException` se `> 0`
  3. Cria usuário com hash bcrypt via `queryRunner.manager.save(User, ...)`
  4. Busca role "ADMIN" via `queryRunner.manager.findOne(Role, ...)` → `InternalServerErrorException` se não encontrar (indica que migration de seed não rodou)
  5. Insere junction table `users_roles` via `queryRunner.manager.save('users_roles', ...)`
  6. `COMMIT`
  7. Retorna `User` com roles carregadas
- `AuthService.setupFirstUser()`:
  1. Double-check count → `ForbiddenException` se `> 0`
  2. Chama `userService.createFirstAdmin(setupDto)`
  3. Gera `accessToken` (15m) e `refreshToken` (7d) via `JwtService` + `TokenPayloadFactory`
  4. Retorna `{ user, accessToken, refreshToken }`
- Testado: `POST /auth/setup` bem-sucedido → usuário criado com role ADMIN
- Testado: segundo POST simultâneo → `403` (via transação)
- Testado: `POST /auth/setup` sem migration de seed → `500` com mensagem "ADMIN role not found"

### T6: [Cross-feature] `JwtAuthGuard` em `POST /users`

**What**: Proteção do endpoint `POST /users` com autenticação JWT.**Implementado na feature `api-security-hardening` (T2)**. Esta tarefa no setup-wizard é um placeholder de dependência.

**Where**: `backend/src/modules/user/controllers/user.controller.ts` (modificado na feature `api-security-hardening`)

**Reuses**: `JwtAuthGuard` de `backend/src/common/guards/jwt-auth.guard.ts`

**Depends on**: **api-security-hardening T2** ( JwtAuthGuard no user controller)

**Done when**:
- `POST /users` sem token → `401 Unauthorized`
- `POST /users` com token válido → `201 Created`
- Feature `api-security-hardening` está merged e migration T1 rodada

---

## Phase 2 — Frontend Foundation

### T7: Add `/setup` route and `SetupPage` component
**What**: Nova rota e página para criação da primeira conta.
**Where**:
- `frontend/src/routes/index.tsx` (modify)
- `frontend/src/pages/Setup.tsx` (new)
**Reuses**: Copy pattern de `Login.tsx` (Card, Input, Button, Form, zod, react-hook-form, lucide icons)
**Depends on**: Nothing (UI first, wiring after)
**Done when**:
- Rota `/setup` adicionada no router (na mesma posição que `/login`, sem `ProtectedRoute`)
- Form com 3 campos: nome (string, min 2), email (string, email), senha (min 6)
- Submit handler chama `api.post('/auth/setup', data)`
- Visual confere com o design system existente (mesmo Card e spacing do Login)
- Testado: página acessível em `http://localhost:8080/setup`

### T8: Add `setup` method to auth service layer
**What**: Método `authService.setup()` para chamar o backend.
**Where**: `frontend/src/services/backend/auth/index.ts` (modify)
**Reuses**: `api` instance, `useOptimisticMutation`, pattern de `useLogin`
**Depends on**: T4 (backend endpoint)
**Done when**:
- `authService.setup()` chama `api.post('/auth/setup', data)` e retorna `{ user, accessToken, refreshToken }`
- Hook `useSetup()` criado com `useOptimisticMutation`, retornando `{ mutate, isPending }`
- On success: toast de boas-vindas
- On error: toast com mensagem do backend

### T9: Add `setupStatus` check & cache logic
**What**: Detecção de setup mode no boot com cache local no localStorage.
**Where**: Novo utility file `frontend/src/utils/setupStatus.ts`, modifica `Login.tsx`
**Reuses**: Axios `api` instance para `GET /auth/setup-status`
**Depends on**: T4 (backend endpoint)
**Done when**:
- Função `checkSetupStatus()`:
  - Lê cache do localStorage (`setup_status_v1` com `{ needsSetup, checkedAt }`)
  - Se cache válido (<24h), usa valor local
  - Se cache expirado/ausente, faz `GET /auth/setup-status` e escreve cache
- `Login.tsx` chama `checkSetupStatus()` no mount (via useEffect)
  - Se `needsSetup: true` → `navigate('/setup', { replace: true })`
  - Se `needsSetup: false` → permite mostrar login normalmente
- Testado: abrir browser incognito + recarregar → setup chamado ao backend → redireciona
- Testado: segundo reload em 24h → usa cache, não chama backend

### T10: Wire SetupPage with authStore (redirect after setup)
**What**: Após setup bem-sucedido, salvar tokens e redirect para a app.
**Where**: `frontend/src/pages/Setup.tsx` (modify)
**Reuses**: `useAuthStore` (chamar `setTokens` + `setUser`)
**Depends on**: T7, T8, T9
**Done when**:
- On success do `useSetup`: chama `useAuthStore.getState().setTokens(at, rt)`, `setUser(user)`
- Redireciona para `/projects`
- Não permite acessar `/setup` depois de criado (se cache disser `needsSetup: false`)
- Testado: setup completo → `localStorage` tem tokens → redireciona → app carrega

### T11: Protect `/setup` from access when setup is complete
**What**: Se usuário navega manualmente para `/setup` após setup, redirecionar para `/login`.
**Where**: `frontend/src/pages/Setup.tsx` (modify)
**Reuses**: Mesmologic de T9
**Depends on**: T9
**Done when**:
- Ao montar `Setup.tsx`, lê/cache de setup status
- Se `needsSetup: false` → `navigate('/login', { replace: true })` antes de renderizar form
- Testado: após setup completo, acessar `http://localhost:8080/setup` → redireciona para login

---

## Phase 3 — Integration & Validation

### T12: End-to-end test: full setup flow
**What**: Testar o fluxo completo do zero.
Depends on**: All previous tasks
**Done when**:
1. Docker compose down + up (banco limpo)
2. Abrir `localhost:8080` → frontend detecta setup → redireciona `/setup`
3. Preencher form → submit → backend cria user admin
4. Redireciona `/projects` → app funciona
5. Logout → `localhost:8080/login` → tela de login normal

### T13: End-to-end test: security gates
**What**: Verificar que registros são bloqueados após setup.
**Depends on**: All previous tasks
**Done when**:
1. Após setup, `POST /auth/register` → `403 Forbidden`
2. Após setup, `POST /auth/setup` → `403 Forbidden`
3. Após setup, `POST /users` sem token → `401 Unauthorized`
4. Após setup, `POST /users` com token admin → `201 Created`

### T14: Build & lint verification
**What**: Garantir que nada quebrou no build.
**Depends on**: All previous tasks
**Done when**:
- `docker exec manager_group_backend_dev npm run build` → sem erros
- `docker exec manager_group_frontend_dev npm run build` → sem erros (se houver build cmd)
- Containers continuam rodando normalmente

---

## Task Dependency Graph

```
Phase 1 (Backend) — Pré-requisito: api-security-hardening T1 (migration de seed de roles)
├── T1 [SetupDto] ───┐
├── T2 [SetupGuard] ─┤
├── T3 [count()] ────┤
│                      ▼
│              T5 [AuthService + UserService createFirstAdmin]
│                      │      ← Pre-req: api-security-hardening T1
│              T4 [AuthController endpoints]
│                      │
└── T6 [UserController guard] ──► independent (cross-feature)

Phase 2 (Frontend)
├── T7 [SetupPage UI] ───┐
│                        ▼
├── T8 [authService.setup()] ──► depends T4
│                        │
├── T9 [setupStatus check] ───┤
│                        │
└── T10 [wire tokens + redirect] ──► depends T7, T8, T9
    │
    ▼
T11 [protect /setup] ──► depends T9

Phase 3 (Validation)
├── T12 [E2E: full flow]
├── T13 [E2E: security gates]
└── T14 [Build + lint]
```

**Parallel tasks**: T6 pode ser feito sempre (independente). T7 pode ser feito enquanto o backend está em progresso. T9 pode começar assim que T4 estiver pronto.

---

## Acceptance Criteria Checklist

### From spec.md:

- [ ] AC 1.1: `GET /auth/setup-status` detecta `needsSetup: true` quando banco vazio
- [ ] AC 1.2: Se `needsSetup: true`, frontend redireciona `/setup`
- [ ] AC 1.3: Se `needsSetup: false`, frontend mostra login
- [ ] AC 1.4: Cache no localStorage evita chamadas repetidas por 24h
- [ ] AC 1.5: Usuário acessando `/setup` manualmente após setup → redireciona login
- [ ] AC 2.1: Form na página `/setup` aceita nome, email, senha
- [ ] AC 2.2: Submit chama `POST /auth/setup`
- [ ] AC 2.3: Primeiro usuário recebe role ADMIN automaticamente
- [ ] AC 2.4: Resposta inclui accessToken + refreshToken
- [ ] AC 2.5: Frontend salva tokens e redireciona `/projects`
- [ ] AC 2.6: `POST /auth/setup` com count > 0 → `403`
- [ ] AC 3.1: `POST /auth/register` permite quando count === 0
- [ ] AC 3.2: `POST /auth/register` rejeita quando count > 0
- [ ] AC 3.3: `POST /users` requer autenticação (`JwtAuthGuard`)

### Error scenarios from spec.md:

- [ ] E1: Backend offline → frontend mostra erro genérico na tela pública
- [ ] E2: Concorrente setup → apenas o primeiro sucede
- [ ] E3: Payload inválido → `400` com erros de validação
- [ ] E4: Segundo setup caller → `403`
- [ ] E5: `/setup` manual após setup → redirect `/login`
