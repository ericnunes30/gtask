# Migrations do Manager Group (Backend)

Este diretorio contem as migrations do TypeORM. A partir de agora, o schema
completo do banco e reproduzido pela migration `BaselineSchema`.

## Estrutura

```text
src/database/
├── database.config.ts      # Configuracao compartilhada (NestJS + CLI)
├── data-source.ts          # DataSource standalone para TypeORM CLI
└── migrations/
    ├── *-BaselineSchema.ts  # Schema completo e seed de roles
    └── README.md
```

## Scripts disponiveis

```bash
# Verificar status das migrations
npm run migration:show

# Gerar nova migration a partir das mudancas nas entities
npm run migration:generate -- src/database/migrations/NomeDaMigration

# Executar migrations pendentes
npm run migration:run

# Reverter a ultima migration
npm run migration:revert
```

## Como gerar uma nova migration

1. Altere as entities conforme necessario.
2. Certifique-se de que o banco dev esta rodando:
   ```bash
   docker compose -f docker-compose.dev.yml up postgres -d
   ```
3. Gere a migration:
   ```bash
   npm run migration:generate -- src/database/migrations/DescricaoDaAlteracao
   ```

## Importante

- `synchronize: false` esta ativo em producao/desenvolvimento.
- `migrationsRun: true` executa as migrations automaticamente no startup.
- A baseline contem o schema completo e o seed inicial das roles
  (`ADMIN`, `GERENTE`, `USER`).
