# 🚀 Plano de Otimização: API Backend Performance

## 📋 Visão Geral
Otimização completa da API backend para eliminar gargalos críticos de performance, implementar segurança adequada e melhorar a escalabilidade do sistema.

## 📊 Análise da Codebase

### Configuração Atual

| Componente | Status | Problema | Impacto |
|------------|--------|----------|---------|
| CORS | ✅ Configurado | Muito permissivo (origin: '*') | Médio |
| Validation | ✅ Ativo | Logging síncrono bloqueante | Alto |
| Error Handling | ✅ Implementado | Pode ser melhorado | Baixo |
| WebSocket | ✅ Funcional | Timeout muito curto | Médio |
| Rate Limiting | ❌ Ausente | Vulnerabilidade crítica | Alto |
| Compression | ❌ Ausente | Respostas grandes sem compressão | Alto |
| Helmet | ❌ Ausente | Falta de segurança HTTP | Alto |
| Timeout | ❌ Ausente | Requisições podem ficar "presas" | Alto |
| Cache | ❌ Ausente | Queries repetitivas | Alto |
| Connection Pool | ❌ Básico | Sem otimizações | Médio |

### Problemas Críticos Identificados

1. **Logging Síncrono Bloqueante** - `main.ts:35-39`
2. **Eager Loading Excessivo** - `task.entity.ts:87`
3. **Queries N+1** - `project.service.ts:49-52`
4. **Sem Proteção contra Abuso** - Sem rate limiting
5. **Respostas não Comprimidas** - Aumento de banda

## 🎯 Objetivos

1. **Reduzir latência da API em 40-60%**
2. **Aumentar throughput em 3-5x**
3. **Implementar segurança adequada**
4. **Melhorar escalabilidade**
5. **Adicionar monitoramento de performance**

## 🛠️ Plano de Implementação

### Fase 1: Crítico - Segurança e Correções (Dia 1-2)

#### 1.1 Instalar Dependências Essenciais
```bash
npm install @nestjs/throttler helmet compression
npm install cache-manager cache-manager-redis-store @nestjs/cache-manager
npm install @types/compression
```

#### 1.2 Implementar Rate Limiting
```typescript
// backend/src/main.ts
import { ThrottlerModule } from '@nestjs/throttler'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Rate Limiting configuration
  app.use(
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000, // 1 minuto
      limit: 100, // 100 requisições por minuto
    }])
  )

  // Aplicar globalmente
  app.use(throttlerMiddleware)
}
```

#### 1.3 Adicionar Helmet para Segurança
```typescript
// backend/src/main.ts
import * as helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
```

#### 1.4 Corrigir Eager Loading Excessivo
```typescript
// backend/src/modules/tasks/entities/task.entity.ts
@Entity('tasks')
export class Task {
  // REMOVER eager: true
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // Adicionar relação lazy quando apropriado
  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: Promise<User>;
}
```

### Fase 2: Performance - Database e Queries (Dia 2-3)

#### 2.1 Otimizar Connection Pooling
```typescript
// backend/src/app.module.ts
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    // ... configurações existentes
    pool: {
      max: 20,           // máximo de conexões
      min: 5,            // mínimo de conexões
      idle: 10000,       // tempo ocioso (ms)
      acquire: 30000,    // timeout para adquirir conexão
    },
    retryAttempts: 3,
    retryDelay: 3000,
    logging: process.env.NODE_ENV === 'development',
  }),
  inject: [ConfigService],
}),
```

#### 2.2 Implementar Cache Strategy
```typescript
// backend/src/cache/cache.module.ts
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        ttl: 60, // 1 minuto default
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class CacheModule {}
```

#### 2.3 Criar Cache Decorators
```typescript
// backend/src/decorators/cache.decorator.ts
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager'

export const Cached = (key?: string, ttl?: number) => {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    CacheKey(key || `${target.constructor.name}_${propertyKey}`)(
      target,
      propertyKey,
      descriptor
    )
    CacheTTL(ttl || 300)(target, propertyKey, descriptor)
  }
}

// Uso nos serviços
@Cached('projects', 600) // 10 minutos
async findAll() {
  return this.projectRepository.find()
}
```

#### 2.4 Corrigir Queries N+1
```typescript
// backend/src/modules/project/services/project.service.ts
@Injectable()
export class ProjectService {
  async findAll(page = 1, limit = 10) {
    const [projects, total] = await this.projectRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['users', 'occupations'],
      order: { createdAt: 'DESC' }
    })

    return { projects, total }
  }

  async findOne(id: number) {
    return this.projectRepository.findOne({
      where: { id },
      relations: ['users', 'occupations']
    })
  }

  // NOVO: Endpoint dedicado para tarefas
  async findProjectTasks(projectId: number, page = 1, limit = 20) {
    const [tasks, total] = await this.taskRepository.findAndCount({
      where: { project_id: projectId },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['users', 'occupations', 'reviewer'],
      order: { createdAt: 'DESC' }
    })

    return { tasks, total }
  }
}
```

### Fase 3: Infraestrutura - Middlewares (Dia 3-4)

#### 3.1 Implementar Compressão
```typescript
// backend/src/main.ts
import * as compression from 'compression'

app.use(compression({
  level: 6,
  threshold: 1024, // apenas respostas > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false
    return compression.filter(req, res)
  }
}))
```

#### 3.2 Implementar Timeout Global
```typescript
// backend/src/middleware/timeout.middleware.ts
@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          statusCode: 504,
          message: 'Request timeout',
          timestamp: new Date().toISOString()
        })
      }
    }, 30000) // 30 segundos

    res.on('finish', () => clearTimeout(timeout))
    next()
  }
}
```

#### 3.3 Corrigir Logging Assíncrono
```typescript
// backend/src/services/async-logger.service.ts
@Injectable()
export class AsyncLoggerService {
  private writeStream: WriteStream

  constructor() {
    const logPath = process.env.LOG_FILE || 'logs/validation-errors.log'

    // Criar diretório se não existir
    const dir = path.dirname(logPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.writeStream = fs.createWriteStream(logPath, { flags: 'a' })
  }

  async log(message: string): Promise<void> {
    return new Promise((resolve) => {
      this.writeStream.write(message + '\n', () => resolve())
    })
  }
}

// Atualizar validation pipe
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => {
      const logMessage = `[${new Date().toISOString()}] Validation Error: ${JSON.stringify(errors)}\n`
      asyncLogger.log(logMessage) // Assíncrono!
      return new BadRequestException(errors)
    },
  })
)
```

### Fase 4: Monitoramento e Otimizações Finais (Dia 4-5)

#### 4.1 Adicionar Monitoramento de Performance
```typescript
// backend/src/middleware/performance.middleware.ts
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()

    res.on('finish', () => {
      const duration = Date.now() - start
      const endpoint = `${req.method} ${req.url}`

      // Log para requisições lentas
      if (duration > 1000) {
        Logger.warn(`Slow request: ${endpoint} - ${duration}ms`)
      }

      // Enviar métricas para Sentry
      Sentry.withScope((scope) => {
        scope.setExtra('responseTime', duration)
        scope.setTag('endpoint', endpoint)
        scope.setTag('method', req.method)

        if (duration > 5000) {
          Sentry.captureMessage(`Very slow request: ${endpoint}`)
        }
      })
    })

    next()
  }
}
```

#### 4.2 Otimizar Configurações WebSocket
```typescript
// backend/src/modules/events/gateways/events.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,    // 60 segundos
  pingInterval: 25000,     // 25 segundos
  maxHttpBufferSize: 1e6, // 1MB
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // ... implementação existente
}
```

#### 4.3 Implementar Health Check
```typescript
// backend/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  async check() {
    return await this.health.check([
      () => this.database.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.memory.check('memory', {
        heap: 'used_heap'
      }),
    ])
  }
}
```

### Fase 5: Otimizações de Banco de Dados (Dia 5)

#### 5.1 Adicionar Índices
```typescript
// backend/src/migrations/YYYYMMDDHHMMSS-add-performance-indexes.ts
export class AddPerformanceIndexes implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices para tabelas principais
    await queryRunner.query(`
      CREATE INDEX idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX idx_tasks_status ON tasks(status);
      CREATE INDEX idx_tasks_reviewer_id ON tasks(reviewer_id);
      CREATE INDEX idx_comments_task_id ON comments(task_id);
      CREATE INDEX idx_project_user_user_id ON project_user(user_id);
      CREATE INDEX idx_project_user_project_id ON project_user(project_id);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_tasks_project_id;
      DROP INDEX idx_tasks_status;
      DROP INDEX idx_tasks_reviewer_id;
      DROP INDEX idx_comments_task_id;
      DROP INDEX idx_project_user_user_id;
      DROP INDEX idx_project_user_project_id;
    `)
  }
}
```

#### 5.2 Implementar Query Builder Otimizado
```typescript
// backend/src/modules/tasks/services/task.service.ts
@Injectable()
export class TaskService {
  async findWithFilters(filters: TaskFilters) {
    const query = this.taskRepository.createQueryBuilder('task')

    // Join seletivo baseado nos filtros
    if (filters.includeProject) {
      query.leftJoinAndSelect('task.project', 'project')
    }

    if (filters.includeUsers) {
      query.leftJoinAndSelect('task.users', 'users')
    }

    // Aplicar filtros
    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status })
    }

    if (filters.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority })
    }

    // Paginação
    const page = filters.page || 1
    const limit = filters.limit || 20

    return query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('task.createdAt', 'DESC')
      .getManyAndCount()
  }
}
```

## 📅 Cronograma Detalhado

| Dia | Fase | Tarefas Principais | Entregáveis |
|-----|------|-------------------|-------------|
| 1 | Crítico | Rate limiting, Helmet, Eager loading | API segura, queries otimizadas |
| 2 | Database | Connection pool, Cache, Queries N+1 | Database otimizado |
| 3 | Infra | Compressão, Timeout, Logging async | Infraestrutura robusta |
| 4 | Monitoramento | Performance middleware, WebSocket | Monitoramento ativo |
| 5 | Banco | Índices, Query builder | Performance máxima |

## 🔧 Configurações de Ambiente

### Variáveis de Ambiente Adicionais
```env
# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=60

# Timeout
REQUEST_TIMEOUT=30000

# WebSocket
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000

# Logging
LOG_FILE=logs/app.log
LOG_LEVEL=info
```

## 📈 Métricas de Sucesso

### Métricas Técnicas
1. **Redução de latência**: 40-60%
2. **Aumento de throughput**: 3-5x
3. **Redução de uso de memória**: 20-30%
4. **Cache hit rate**: > 80%

### Métricas de Negócio
1. **Tempo de resposta da API**: < 500ms (p95)
2. **Uptime**: > 99.9%
3. **Segurança**: Proteção contra ataques comuns
4. **Escalabilidade**: Suporte a 10x mais usuários

## ⚠️ Riscos e Mitigação

### 1. Risco: Breaking Changes
**Mitigação**:
- Implementar gradualmente
- Manter backward compatibility
- Testar em ambiente de staging

### 2. Risco: Complexidade Operacional
**Mitigação**:
- Documentar todas as mudanças
- Criar playbooks de operação
- Monitoramento ativo

### 3. Risco: Performance Regression
**Mitigação**:
- Medir antes e depois
- Testes de carga
- Rollback rápido disponível

## 🔄 Pós-Implementação

### 1. Monitoramento Contínuo
- Configurar dashboards de performance
- Alertas para anomalias
- Análise de tendências

### 2. Otimizações Contínuas
- Análise de logs lentos
- Otimizar queries baseado em uso real
- Ajustar estratégias de cache

### 3. Documentação
- Atualizar documentação da API
- Criar guias de operação
- Documentar decisões arquiteturais

---

**Status**: Pronto para implementação
**Prioridade**: Crítica
**Estimativa de esforço**: 5 dias
**Impacto esperado**: Transformacional (melhoria drástica em performance e segurança)