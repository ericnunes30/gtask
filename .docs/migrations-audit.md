# Auditoria das Migrations TypeORM — Diagnóstico e Orientações

Repositório: `manager-group/backend`  
Data da análise: 2026-06-21  
Analista: Pi

---

## 1. Resumo executivo

As migrations do projeto ** funcionam em ambiente dev**, mas têm
problemas estruturais que precisam ser corrigidos para garantir
**previsibilidade em produção** e para atender melhor o critério **2.8**
do Quality Gate.

**Status geral:** 🟡 **Funcional, porém inconsistente com as entities**

---

## 2. Configuração atual

### 2.1 `src/app.module.ts`

```ts
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    // ...conexão
    autoLoadEntities: true,
    synchronize: false,      // ✅ correto
    migrationsRun: true,       // ✅ correto (adicionado recentemente)
    migrations: ['dist/migrations/*.js'],
  }),
})
```

**Avaliação:** boa. `synchronize: false` evita DDL automático e
`migrationsRun: true` executa migrations na inicialização.

### 2.2 `package.json` — scripts TypeORM

```json
"db:migrate": "node dist/console.js db:migrate"
```

**Problema:** o `README.md` de `src/migrations/` menciona scripts que
**não existem** no `package.json`:

```bash
npm run migration:generate src/migrations/NomeDaMigration  # ❌ não existe
npm run migration:run                                      # ❌ não existe
npm run migration:revert                                   # ❌ não existe
npm run migration:show                                     # ❌ não existe
```

**Risco alto:** sem esses scripts, não é possível gerar migrations a
partir de diferenças entre entities e banco. Isso leva a migrations
manuais (como as atuais), que são propensas a erro.

### 2.3 `tsconfig.json`

```json
{
  "compilerOptions": { "outDir": "./dist" },
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

Migrations em `src/migrations/*.ts` serão compiladas para
`dist/migrations/*.js` — ✅ caminho compatível com o `migrations: []`
configurado.

---

## 3. Mapeamento das migrations

| # | Timestamp | Nome da migration | Tipo | Tamanho | Observação |
|---:|---|---|---|---:|:---|
| 1 | `1755687676971` | EmptyValidationMigration | vazia | 640 B | Ponto de partida |
| 2 | `1756202134358` | FixRoleCreatedAt | DDL | 653 B | Adiciona `createdAt`/`updatedAt` em `roles` |
| 3 | `1756370883610` | CreateTaskLocksTable | DDL | 653 B | Cria `task_locks` |
| 4 | `1756381500757` | CreateNotificationTable | DDL | 1.065 B | Cria `notifications` (legado) |
| 5 | `1756992000000` | create_structured_notifications_table | DDL | 2.880 B | Cria `structured_notifications` |
| 6 | `1757000000000` | FixActivityLogCreatedAtDefault | DDL | 951 B | Defaults em `activity_logs` e `comment_likes` |
| 7 | `1757000000001` | migrate-notification-data-to-new-format | DML | 8.023 B | Migra dados JSON |
| 8 | `1757936000000` | AddIsActiveAndWhatsappToUsers | DDL | 740 B | Adiciona colunas em `users` |
| 9 | `1757936000001` | AddWhatsAppFieldsToUsers | DDL | 1.856 B | Mais colunas em `users` |
| 10 | `1757936000002` | RemovePhoneNumberFromUsers | DDL | 693 B | Remove `phone_number` |
| 11 | `1757936000003` | FixUsersCreatedAtDefault | DDL | 907 B | Defaults em `users` |
| 12 | `1757936000004` | FixTasksDatesNullable | DDL | 1.323 B | `start_date`/`due_date` nullable |
| 13 | `1757936000005` | FixIDOverflowBigInt | DDL | 12.792 B | Converte `id` para `bigint` |
| 14 | `1757936000006` | SeedDefaultRoles | DML | 867 B | Insere `ADMIN` e `USER` |

---

## 4. Problemas encontrados

### 4.1 🚨 **Inconsistência entities × migrations (IDs grandes)**

A migration `FixIDOverflowBigInt` converte `projects.id`, `tasks.id` e
`recurring_tasks.id` para `bigint`. Entretanto, as entities ainda usam:

```ts
@PrimaryGeneratedColumn()
id!: number;  // ❌ TypeScript pensa que é number, mas o banco é bigint
```

**Risco:** em produção, IDs grandes (`> Number.MAX_SAFE_INTEGER`) podem
causar arredondamento no JavaScript. Para manter `number` no Node.js,
o banco deve continuar como `integer` ou a entidade deve tipar como
`string`/`bigint`.

**Recomendação:** decidir uma das três estratégias:

| Estratégia | Ação | Impacto |
|---|---|---|
| A — Reverter para `integer` | Remover `FixIDOverflowBigInt` e ajustar sequences | Menor risco, IDs pequenos |
| B — Manter `bigint` no banco, `number` na app | Aceitar risco de overflow | Requer documentação |
| C — Usar `bigint`/`string` nas entities | Mudar tipo TS para `bigint` e serialização | Mudança grande na API |

### 4.2 🚨 **Migrations não cobrem todas as entities**

Não há migrations que criam/explicitem os schemas de:

- `users` (criado por `synchronize: true` no passado, presumivelmente)
- `projects`
- `tasks`
- `recurring_tasks`
- `occupations`
- `comments`
- `comment_likes`
- `users_roles` (join table)
- `users_occupations` (join table)
- `projects_users` (join table)
- `occupations_projects` (join table)
- `occupations_tasks` (join table)
- `task_user` (join table)
- `comment_user_mentions` (join table)

**Risco:** banco novo (ambiente de staging/prod a partir de zero) pode
ter schema divergente do ambiente dev, porque não existe migration
base que reproduza o schema completo.

### 4.3 ⚠️ **Migrations de "fix" acumuladas**

Várias migrations corrigem defaults e colunas que deveriam estar na
criação original das tabelas. Isso é normal em projetos que migraram
de `synchronize: true`, mas dificulta a criação de um banco do zero.

Exemplos:
- `FixRoleCreatedAt`
- `FixActivityLogCreatedAtDefault`
- `FixUsersCreatedAtDefault`
- `FixTasksDatesNullable`

### 4.4 ⚠️ **Migrations conflitantes/sobrepostas em `users`**

Três migrations operam em `users` em sequência muito curta
(`1757936000000`, `0001`, `0002`, `0003`):

- `AddIsActiveAndWhatsappToUsers` adiciona `is_active` e `whatsapp`
- `AddWhatsAppFieldsToUsers` adiciona `phone_number` (depois remove? não, essa é outra)
- `RemovePhoneNumberFromUsers` remove `phone_number`
- `FixUsersCreatedAtDefault` ajusta defaults

Isso indica iteração caótica. Poderiam ser consolidadas em uma única
migration para reduzir histórico, **desde que nunca tenham sido
executadas em produção**.

> ⚠️ **Não consolidar** se já foram aplicadas em produção.

### 4.5 ⚠️ **Falta padronização de nomenclatura**

Alguns arquivos usam `PascalCase` (`FixRoleCreatedAt...`), outros usam
`snake_case` (`create_structured_notifications_table...`). Recomendo
adotar um único padrão:

```
YYYYMMDDHHMMSS-DescricaoBreve.ts
```

### 4.6 ⚠️ **`README.md` desatualizado**

Lista apenas `EmptyValidationMigration` como "executada". O restante
das migrations não está documentado.

### 4.7 ⚠️ **Falta script `migration:generate`**

Sem ele, não há como comparar entities vs banco para gerar migrations
incrementais automaticamente.

---

## 5. Diagnóstico por entity

| Entity | Tabela | Criada por migration? | Observação |
|---|---|:---:|:---|
| `User` | `users` | ❌ presumido `synchronize` | Colunas whatsapp cobertas parcialmente |
| `Role` | `roles` | ❌ presumido `synchronize` | `createdAt`/`updatedAt` via migration |
| `Task` | `tasks` | ❌ presumido `synchronize` | IDs bigint migrados; nullable dates |
| `Project` | `projects` | ❌ presumido `synchronize` | IDs bigint migrados |
| `RecurringTask` | `recurring_tasks` | ❌ presumido `synchronize` | IDs bigint migrados |
| `Occupation` | `occupations` | ❌ presumido `synchronize` | — |
| `Comment` | `comments` | ❌ presumido `synchronize` | — |
| `CommentLike` | `comment_likes` | ❌ presumido `synchronize` | Defaults migrados |
| `ActivityLog` | `activity_logs` | ❌ presumido `synchronize` | Defaults migrados |
| `TaskLock` | `task_locks` | ✅ | — |
| `Notification` (legado) | `notifications` | ✅ | — |
| `StructuredNotificationEntity` | `structured_notifications` | ✅ | — |

---

## 6. Orientações / Plano de ação recomendado

### 6.1 Curto prazo (sem impacto no banco atual)

1. **Corrigir `README.md`** de `src/migrations/` para refletir as
   migrations reais e os scripts existentes.
2. **Adicionar scripts TypeORM** no `package.json`:
   ```json
   "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/data-source.ts src/migrations/NomeMigration",
   "migration:run": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts",
   "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/data-source.ts",
   "migration:show": "typeorm-ts-node-commonjs migration:show -d src/data-source.ts"
   ```
   ⚠️ Isso exige criar `src/data-source.ts` (DataSource standalone).
3. **Padronizar nomes** das novas migrations para `YYYYMMDDHHMMSS-Descricao.ts`.

### 6.2 Médio prazo (requer decisão do time)

4. **Decidir sobre o `bigint`**: recomendo **reverter para `integer`**
   se o volume de dados não justifica bigint. Se for manter bigint,
   tipar as entities como `bigint` ou `string` e ajustar a serialização
   da API.
5. **Criar migration base** que reproduza o schema completo a partir
   de zero. Isso pode ser feito com:
   ```bash
   npm run migration:generate src/migrations/BaselineSchema
   ```
   em um banco novo criado a partir das entities.
6. **(Opcional) Consolidar migrations antigas** — apenas se **nunca**
   tiverem sido executadas em produção.

### 6.3 Longo prazo

7. Adicionar testes de integração que rodem migrations em um banco
   limpo (ex: PostgreSQL em container efêmero) e verifiquem se a
   aplicação consegue iniciar.

---

## 7. Riscos de seguir do jeito atual

| Risco | Probabilidade | Impacto |
|---|---|---|
| Novo dev/staging com schema diferente do prod | Alta | Alta |
| `bigint` causando arredondamento de IDs | Média | Alta |
| Não conseguir gerar migrations automaticamente | Alta | Média |
| Migrations manuais com erros de constraint | Média | Média |
| Dificuldade de rollback em produção | Média | Média |

---

## 8. Decisões pendentes

Antes de aplicar qualquer correção, precisamos decidir:

1. **Manter ou reverter `bigint`?**
2. **As migrations atuais já foram executadas em produção?** (define se podemos consolidar)
3. **Qual padrão de nomenclatura adotar?**
4. **Vamos criar um `data-source.ts` standalone?**

---

## 9. Próxima ação sugerida

Eu recomendo **não aplicar alterações de schema agora**. Em vez disso:

1. Rodar `npm run migration:show` (depois de criar o script) para ver
   quais migrations já estão aplicadas no banco dev.
2. Gerar uma migration baseline em um banco limpo para comparar com o
   schema atual do banco de dev.
3. Com base na diferença, decidir se consolida ou cria migrations
   corretivas.
