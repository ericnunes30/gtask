# Design: Setup Wizard (First-User Onboarding)

## Overview

Este documento detalha a arquitetura técnica da feature Setup Wizard. O objetivo é detectar instalações novas e permitir a criação da primeira conta de administrador, enquanto fecha definitivamente o registro público após o setup.

## Architecture Principles

1. **Fail-safe**: Se tudo falhar e não houver usuário, o sistema ainda deve permitir setup (fallback para a tela de setup).
2. **Surgical**: Mínima mudança possível no código existente. Reusa o máximo.
3. **Idempotent**: `POST /auth/setup` chamado 2x com userCount=0 deve ter o mesmo resultado. Chamado com userCount>0 deve rejeitar.
4. **Self-contained**: Não depende de features futuras (ex: SMTP, convites).

## System Architecture

### Flow Diagram: Setup Detection & Execution

```
Usuário abre app ──→ Frontend bootstrap
                          │
                          ▼
                    ┌──────────────────────┐
                    │ Checar localStorage  │
                    │  setupStatus: {       │
                    │     needsSetup,       │
                    │     checkedAt         │
                    │  }                   │
                    └──────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
      Cache válido (<24h)          Cache expirado/ausente
            │                           │
            ▼                           ▼
      Redireciona baseado      Call GET /auth/setup-status
      no valor salvo                   │
                                       ▼
                              ┌─────────────────────┐
                              │  needsSetup: true   │──→ Salva cache ──→ Redireciona /setup
                              │  needsSetup: false  │──→ Salva cache ──→ Permanece /login
                              └─────────────────────┘
```

### Flow Diagram: Setup Creation

```
Usuário acessa /setup
       │
       ▼
┌──────────────────┐
│ Form (name,      │
│ email, password) │
└──────────────────┘
       │
       ▼
POST /auth/setup
       │
       ▼
┌────────────────────────────────┐
│ 1. SELECT COUNT(*) FROM users │
│    → count > 0 → 403           │
│    → count = 0 → continua     │
│ 2. Cria usuário com hash bcrypt│
│ 3. Atribui role "ADMIN"       │
│ 4. Gera JWT tokens             │
└────────────────────────────────┘
       │
       ▼
Setup completo ──→ Frontend salva tokens
                          │
                          ▼
                     Redireciona /projects
```

## Backend Design

### Module Boundaries

A feature reside no módulo existente `AuthModule` (não cria módulo novo). Isso é correto porque:
- Setup é uma operação de autenticação (cria usuário + gera tokens, como login)
- Reusa AuthService, UserService, JwtService
- Não cria novas entidades — apenas reusa User + Role

### New Endpoints

```
GET  /auth/setup-status  → SetupStatusResponse
POST /auth/setup         → SetupResponse (reusa formato do login)
```

### Modified Endpoints

```
POST /auth/register     → Guard SetupGuard (bloqueia se count > 0)
POST /users             → Guard JwtAuthGuard (bloqueia se não autenticado)
```

### Implementation Plan: Backend

#### 1. AuthController (modificado)

```typescript
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // --- EXISTING (unchanged) ---
  @Post('login')
  async login(@Body() loginDto: LoginDto) { ... }

  @Post('refresh')
  async refreshToken(...) { ... }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req) { ... }

  @Post('verify')
  @UseGuards(AuthGuard('jwt'))
  async verifyToken(...) { ... }

  // --- NEW ---

  @Get('setup-status')
  async getSetupStatus() {
    return this.authService.checkSetupStatus();
    // Returns: { needsSetup: boolean }
    // Implementation: SELECT COUNT(1) FROM users
  }

  @Post('setup')
  async setup(@Body() setupDto: SetupDto) {
    return this.authService.setupFirstUser(setupDto);
    // Returns: { user, accessToken, refreshToken }
  }

  // --- MODIFIED (SetupGuard added) ---
  @Post('register')
  @UseGuards(SetupGuard)  // NEW: allows only when userCount === 0
  async register(@Body() registerDto: RegisterDto) { ... }
}
```

#### 2. New SetupDto

Local: `backend/src/modules/auth/dto/setup.dto.ts`

```typescript
export class SetupDto {
  @IsString() @MinLength(2) @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(6)
  password: string;
}
```

**Racional**: Cria DTO próprio para setup, em vez de reutilizar `RegisterDto`, porque:
- Pode divergir no futuro (ex: adicionar `confirmPassword`)
- Semântica diferente (setup ≠ register)
- Documentação swagger mais clara

#### 3. New SetupGuard

Local: `backend/src/common/guards/setup.guard.ts`

```typescript
@Injectable()
export class SetupGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const count = await this.userService.count();
    if (count === 0) return true; // Allow setup-related actions
    throw new ForbiddenException('Setup completed. Registration is closed.');
  }
}
```

**Racional**: Guard custom para proteger `POST /auth/register` e `POST /auth/setup`. Permite apenas quando `userCount === 0`.

#### 4. AuthService (modificado)

```typescript
@Injectable()
export class AuthService {
  // ... existing methods ...

  async checkSetupStatus(): Promise<{ needsSetup: boolean }> {
    const count = await this.userService.count();
    return { needsSetup: count === 0 };
  }

  async setupFirstUser(setupDto: SetupDto) {
    const count = await this.userService.count();
    if (count > 0) {
      throw new ForbiddenException('Setup already completed. Please login.');
    }

    // AuthService only orchestrates; user creation logic stays in UserService
    const user = await this.userService.createFirstAdmin(setupDto);

    // Generate tokens (same logic as login())
    const accessTokenPayload = this.tokenPayloadFactory.createPayload(user, 'extended');
    const refreshTokenPayload = { sub: user.id };
    const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(refreshTokenPayload, { expiresIn: '7d' });

    return { user, accessToken, refreshToken };
  }
}
```

#### 5. UserService (modificado)

```typescript
@Injectable()
export class UserService {
  // ... existing methods ...

  async count(): Promise<number> {
    return await this.userRepository.count();
  }

  async createFirstAdmin(data: SetupDto) {
    // Transaction via QueryRunner to prevent race conditions
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verify no users exist under transaction
      const count = await queryRunner.manager.count(User);
      if (count > 0) {
        throw new ForbiddenException('Setup already completed.');
      }

      // 2. Create user (reuse existing hash logic inline for transaction safety)
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = queryRunner.manager.create(User, {
        ...data,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const savedUser = await queryRunner.manager.save(User, user);

      // 3. Find existing ADMIN role (guaranteed by api-security-hardening migration T1)
      const adminRole = await queryRunner.manager.findOne(Role, {
        where: { name: 'ADMIN' },
      });
      if (!adminRole) {
        throw new InternalServerErrorException('ADMIN role not found. Ensure api-security-hardening migration has run.');
      }

      // 4. Assign role via users_roles junction table
      await queryRunner.manager.save('users_roles', {
        user_id: savedUser.id,
        role_id: adminRole.id,
      });

      // Load user with roles for response
      savedUser.roles = [adminRole];

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Nota**: `createFirstAdmin` NÃO cria a role `ADMIN` se não existir. Essa responsabilidade pertence à migration `T1` da feature `api-security-hardening`. Se `ADMIN` não for encontrado, lança `InternalServerErrorException` com mensagem indicando a dependência. Isso evita:
1. Conflito de concerns (setup wizard vs. seed de dados)
2. Criação de roles com IDs inconsistentes entre migrations e runtime
3. Esquecimento de rodar a migration `T1` (mensagem de erro clara indica o problema)

#### 6. UserController (modificado)

Adicionar `@UseGuards(JwtAuthGuard)` ao `POST /users`:

```typescript
@Controller('users')
// Add guard at controller level for some endpoints, or per-method
export class UserController {
  @Post()
  @UseGuards(JwtAuthGuard)  // NEW
  async create(@Body() createUserDto: CreateUserDto) { ... }
  // Other endpoints: findAll, findOne, update, remove might also need guards
}
```

**Nota**: O spec diz apenas `POST /users`. Porém, para consistência de segurança, todos os endpoints do UserController devem eventualmente ter `JwtAuthGuard`. Para este feature, o foco é `POST /users` porque é o endpoint de criação público.

### Database Operations

| Query | Frequency | Performance |
|-------|-----------|-------------|
| `SELECT COUNT(1) FROM users` | 1x por boot + on-demand | ~1ms em qualquer tamanho (PostgreSQL usa índice) |
| `INSERT INTO users (...) VALUES (...)` | 1x no setup | ~5ms |
| `INSERT INTO users_roles (...)` | 1x no setup | ~2ms |
| `SELECT * FROM roles WHERE name = 'ADMIN'` | 1x no setup | ~1ms |

### Transactional Safety

A criação do primeiro usuário deve ser uma transação única:
- Se o INSERT de usuário falhar, nada é criado
- Se o SELECT da role `ADMIN` não retornar nada (migration não rodou), a transação falha com `InternalServerErrorException` — prevenindo criação de admin sem role
- Se COUNT(*) confirma `0` no início e outro processo cria um usuário no meio, a transação do segundo deve falhar (constraint unique ou COUNT > 0)

**Implementação**: Usar `QueryRunner` do TypeORM com atomicidade: check count → create user → find ADMIN role → insert into users_roles → commit. Se qualquer passo falha, rollback completo.
```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  const count = await queryRunner.manager.count(User);
  if (count > 0) throw new ForbiddenException('Setup already completed.');
  const savedUser = await queryRunner.manager.save(User, user);
  await queryRunner.manager.save(UserRoles, { userId: savedUser.id, roleId: adminRole.id });
  await queryRunner.commitTransaction();
} catch (err) {
  await queryRunner.rollbackTransaction();
  throw err;
} finally {
  await queryRunner.release();
}
```

## Frontend Design

### Route Architecture

```typescript
// frontend/src/routes/index.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/setup" element={<Setup />} />  {/* NEW */}
  <Route path="/" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
  {/* ... other protected routes ... */}
</Routes>
```

### Entry Point: Setup Gate

A detecção de setup status deve ocorrer antes de renderizar Login ou Setup. A forma mais limpa é no `App.tsx` (ou Router wrapper), verificando antes de decidir o que renderizar.

**Abordagem A: SetupGate component (recomendado)**
No `App.tsx`, wrappar `<AppRoutes />` com um `<SetupGate>`:

```typescript
// frontend/src/components/SetupGate.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/services/backend/api';

const SETUP_CACHE_KEY = 'setup_status_v1';
const SETUP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface SetupCache {
  needsSetup: boolean;
  checkedAt: number;
}

function getCachedSetup(): SetupCache | null {
  try {
    const raw = localStorage.getItem(SETUP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetupCache;
    const isExpired = Date.now() - parsed.checkedAt > SETUP_CACHE_TTL_MS;
    if (isExpired) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedSetup(needsSetup: boolean) {
  localStorage.setItem(SETUP_CACHE_KEY, JSON.stringify({
    needsSetup,
    checkedAt: Date.now()
  }));
}

export function useSetupStatus() {
  const [status, setStatus] = useState<'unknown' | 'setup' | 'ready'>('unknown');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only check on public routes
    if (!['/login', '/setup'].includes(location.pathname)) {
      setStatus('ready');
      return;
    }

    const cached = getCachedSetup();
    if (cached) {
      if (cached.needsSetup) {
        if (location.pathname !== '/setup') navigate('/setup', { replace: true });
      } else {
        if (location.pathname !== '/login') navigate('/login', { replace: true });
      }
      setStatus(cached.needsSetup ? 'setup' : 'ready');
      return;
    }

    // Call backend
    api.get('/auth/setup-status')
      .then(res => {
        const needsSetup = res.data.needsSetup;
        setCachedSetup(needsSetup);
        if (needsSetup) {
          if (location.pathname !== '/setup') navigate('/setup', { replace: true });
          setStatus('setup');
        } else {
          if (location.pathname !== '/login') navigate('/login', { replace: true });
          setStatus('ready');
        }
      })
      .catch(() => {
        // On error, default to login (allows retry)
        setStatus('ready');
      });
  }, []);

  return status;
}
```

**Onde colocar o `useSetupStatus`**:
- No `Login.tsx`: antes de renderizar o formulário de login, chamar `useSetupStatus` para possível redirect
- No `Setup.tsx`: antes de renderizar, chamar `useSetupStatus` para possível redirect
- Alternativa mais simples: chamar no `AuthContextAdapter.tsx` que é carregado no bootstrap do app

**Abordagem recomendada**: Colocar a lógica no `AuthContextAdapter.tsx` (já é o ponto central de auth no bootstrap). O `AuthContextProvider` já é renderizado no `App.tsx`, então o check corre automaticamente no boot.

### New Component: SetupPage

Local: `frontend/src/pages/Setup.tsx`

```typescript
// Reuses: Login.tsx patterns (Card, Form, Input, Button, zod, react-hook-form)
// Differences from Login:
//   - Extra field: name
//   - No "remember me" checkbox
//   - Copy: "Criar conta de administrador" instead of "Entrar"
//   - After submit: saves tokens + redirects to /projects
//   - Footer link to /login (in case user navigated manually)
```

#### UI Schema
```
┌─────────────────────────────────────┐
│         Bem-vindo ao                │
│      Gerenciador de Projetos        │
│                                     │
│ Configure sua conta de              │
│ administrador para começar          │
├─────────────────────────────────────┤
│ Nome                                │
│ [____________________]             │
│                                     │
│ Email                               │
│ [____________________]  📧         │
│                                     │
│ Senha                               │
│ [____________________]  👁️         │
│                                     │
│ [ Criar conta e entrar ]            │
├─────────────────────────────────────┤
│ Já tem uma conta? [Entrar]          │
└─────────────────────────────────────┘
```

#### Form Validation (Zod)
```typescript
const setupSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(255, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
```

#### State Management After Setup
Reusa authStore (`useAuthStore`):
```typescript
const auth = useAuthStore();
// After successful setup:
auth.setTokens(accessToken, refreshToken);
auth.setUser(user);
navigate('/projects', { replace: true });
```

### Service Layer

Local: `frontend/src/services/backend/auth/index.ts`

```typescript
const authService = {
  // ... existing methods ...

  async checkSetupStatus(): Promise<{ needsSetup: boolean }> {
    const response = await api.get('/auth/setup-status');
    return response.data;
  },

  async setup(data: SetupRequest): Promise<AuthResponse> {
    // Returns same shape as login: { accessToken, refreshToken, user }
    const response = await api.post('/auth/setup', data);
    return response.data.data || response.data;
  },
};

// React Query hooks
export const useSetupStatus = () => useOptimizedQuery(...);
export const useSetup = () => useOptimisticMutation(...);
```

### Modified Component: Login.tsx

Adicionar verificação de setup status ao montar:
```typescript
const Login = () => {
  // ... existing code ...

  // Check setup status on mount
  useEffect(() => {
    const runSetupCheck = async () => {
      try {
        const cached = getCachedSetup();
        if (cached && cached.needsSetup) {
          navigate('/setup', { replace: true });
          return;
        }
        if (!cached) {
          const { data } = await api.get('/auth/setup-status');
          setCachedSetup(data.needsSetup);
          if (data.needsSetup) {
            navigate('/setup', { replace: true });
          }
        }
      } catch {
        // Ignore error, let user see login
      }
    };
    runSetupCheck();
  }, []);

  // ... rest of Login component ...
};
```

## Test Strategy

### Backend Tests

| Test | Type | Where |
|------|------|-------|
| `GET /auth/setup-status` returns `{ needsSetup: true }` when no users | Integration | `auth.controller.spec.ts` |
| `GET /auth/setup-status` returns `{ needsSetup: false }` when users exist | Integration | `auth.controller.spec.ts` |
| `POST /auth/setup` creates first user with role `ADMIN` | Integration | `auth.controller.spec.ts` |
| `POST /auth/setup` returns 403 when users already exist | Integration | `auth.controller.spec.ts` |
| `POST /auth/register` allowed when no users (integration with SetupGuard) | Integration | `auth.controller.spec.ts` |
| `POST /auth/register` returns 403 when users exist | Integration | `auth.controller.spec.ts` |
| `POST /users` returns 401 without auth token | E2E | `users.e2e-spec.ts` |
| Transaction: concurrent setup returns 403 to second caller | Integration | `auth.service.spec.ts` |

### Frontend Tests

| Test | Strategy |
|------|----------|
| `/login` redirects to `/setup` when `setup-status` returns `needsSetup: true` | Component test (vitest) |
| `/setup` redirects to `/login` when user exists (manual navigation) | Component test |
| `/setup` form submits correct payload | Component test (MSW mock) |
| Successful setup saves tokens and redirects to `/projects` | Component test |
| Cache hit reads from localStorage without API call | Unit test |
| Cache miss calls API and writes to localStorage | Unit test |
| Cache expired (>24h) re-calls API | Unit test |

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | `GET /auth/setup-status` retorna `needsSetup: boolean` | Futuro-proof: permite adicionar `version`, `features` no futuro sem mudar o contrato principal |
| D2 | Setup é um DTO separado (`SetupDto`), não reusa `RegisterDto` | Semântica diferente; permite divergência futura |
| D3 | Setup endpoint está no `AuthModule`, não cria módulo novo | Setup é essencialmente um "login com registro implícito"; reusa token generation |
| D4 | `createFirstAdmin` retorna apenas `User`, tokens gerados no `AuthService` | Separação de concerns: UserService gerencia dados, AuthService gerencia tokens |
| D5 | Cache local no frontend com TTL de 24h | Equilíbrio entre UX (não fazer chamada a cada refresh) e robustez (eventualmente detecta mudanças) |
| D6 | `POST /auth/register` recebe `SetupGuard` (permite quando userCount === 0) | Manter compatibilidade com scripts de automação em instalação nova |
| D7 | `POST /users` recebe `JwtAuthGuard` | Implementado na feature `api-security-hardening` (T2). Referenciado aqui por cross-feature awareness. |
| **D8** | **`UserService.createFirstAdmin` NÃO cria a role `ADMIN` se não existir** | Responsabilidade pertence à migration T1 da feature `api-security-hardening`. Setup wizard assume que a role já existe. Se não existir, retorna `InternalServerErrorException` com mensagem clara. |
| **D9** | **`UserService.createFirstAdmin` usa `QueryRunner` transacional** | Previne race condition entre dois setups simultâneos. COUNT, INSERT user, find role, INSERT user_roles são atomicamente consistentes. |

## Open Questions

1. **Todos os endpoints do `UserController` devem ter `JwtAuthGuard`?** O spec diz apenas `POST /users`, mas idealmente `GET /users`, `DELETE /users/:id` etc. também deveriam. Para este feature, o foco é `POST /users` por ser o endpoint de criação público. O `api-security-hardening` cobre isso.
2. **O campo `confirmPassword` entra no setup form?** Decisão de UI: sim, para evitar erro de digitação na senha de admin. Adiciona um campo extra ao `SetupDto` ou valida no frontend apenas.
3. ~~Qual a role padrão do sistema?~~ **RESOLVIDO**: Migration `T1` da feature `api-security-hardening` seeda roles `ADMIN` e `USER`. Setup wizard apenas busca e atribui `ADMIN`. Não cria runtime.

## Files Changed Summary

### Backend (new files)
- `backend/src/modules/auth/dto/setup.dto.ts`
- `backend/src/common/guards/setup.guard.ts`

### Backend (modified files)
- `backend/src/modules/auth/controllers/auth.controller.ts`
- `backend/src/modules/auth/services/auth.service.ts`
- `backend/src/modules/user/services/user.service.ts`
- `backend/src/modules/user/controllers/user.controller.ts` (add JwtAuthGuard)

### Frontend (new files)
- `frontend/src/pages/Setup.tsx`
- `frontend/src/components/SetupGate.tsx` (optional, if using gate component)

### Frontend (modified files)
- `frontend/src/routes/index.tsx` (add `/setup` route)
- `frontend/src/services/backend/auth/index.ts` (add setup methods)
- `frontend/src/services/backend/routes.ts` (add `setup` route constant)
- `frontend/src/stores/authStore.ts` (add `setup` action or reuse `setTokens/setUser`)
- `frontend/src/pages/Login.tsx` (add setup status check)
- `frontend/src/contexts/adapters/AuthContextAdapter.tsx` (add setup check on boot)
