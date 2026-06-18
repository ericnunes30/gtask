# Auth Module

Módulo responsável por autenticação e autorização de usuários.

## 🏗️ Estrutura

```
auth/
├── controllers/
│   └── auth.controller.ts        # Endpoints de autenticação
├── dto/
│   ├── login.dto.ts             # Validação de login
│   └── register.dto.ts          # Validação de registro
├── factories/
│   ├── auth-response.factory.ts  # Factory para respostas de auth
│   ├── token-payload.factory.ts  # Factory para payloads JWT
│   └── user-validation.factory.ts # Factory para validação de usuários
├── services/
│   └── auth.service.ts          # Lógica de autenticação
├── strategies/
│   ├── jwt.strategy.ts          # Estratégia JWT
│   ├── local.strategy.ts        # Estratégia local
│   └── password/
│       ├── bcrypt-verification.strategy.ts
│       ├── password-verification-strategy.interface.ts
│       ├── password-verification.factory.ts
│       └── scrypt-verification.strategy.ts
└── auth.module.ts
```

## 🎯 Padrões Implementados

### Factory Pattern
- **TokenPayloadFactory**: Diferentes formatos de payload JWT
- **AuthResponseFactory**: Diferentes formatos de resposta
- **UserValidationFactory**: Validação de credenciais
- **PasswordVerificationFactory**: Diferentes algoritmos de hash

### Strategy Pattern
- **Password Verification**: Suporte a Bcrypt e Scrypt
- **JWT/Local Strategies**: Diferentes métodos de autenticação

## 📡 Endpoints

### POST /auth/login
Realiza login e retorna JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "jwt_token_here",
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

### POST /auth/register
Registra um novo usuário.

**Request:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

## 🔐 Segurança

### Suporte a Múltiplos Hash Algorithms
- **Bcrypt**: Hash padrão
- **Scrypt**: Compatibilidade com AdonisJS

### JWT Configuration
- **Secret**: Configurável via environment
- **Expiry**: 24 horas por padrão
- **Payload**: Minimal (email + sub)

## 🧪 Testing

```bash
npm test -- --testPathPatterns="auth"
```

### Testes Incluem:
- ✅ Validação de credenciais corretas/incorretas
- ✅ Geração de JWT tokens
- ✅ Registro de usuários
- ✅ Verificação de tokens
- ✅ Multiple password hash strategies

## 🚀 Uso

```typescript
// Injetar no controller
constructor(private authService: AuthService) {}

// Login
const result = await this.authService.login(loginDto);

// Validar usuário
const user = await this.authService.validateUser(email, password);

// Verificar token
const payload = await this.authService.verifyToken(token);
```

## 🔧 Configuração

### Environment Variables
```env
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
```

### Module Import
```typescript
@Module({
  imports: [AuthModule],
})
export class AppModule {}
```

## 🎭 Extensibilidade

### Adicionar Nova Estratégia de Password
```typescript
export class NewHashStrategy implements PasswordVerificationStrategy {
  canHandle(hashedPassword: string): boolean {
    return hashedPassword.startsWith('$newhash$');
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    // Implementar nova lógica
  }
}
```

### Adicionar Novo Formato de Response
```typescript
export class CustomResponseStrategy implements AuthResponseStrategy {
  canHandle(context?: string): boolean {
    return context === 'custom';
  }

  createResponse(accessToken: string, user: any): any {
    // Retornar formato customizado
  }
}
```