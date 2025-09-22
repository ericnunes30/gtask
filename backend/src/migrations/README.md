# Migrations do Backend-2

Este diretório contém as migrations do TypeORM que mantêm o banco de dados sincronizado com as definições das entities.

## Scripts Disponíveis

```bash
# Gerar nova migration baseada nas mudanças nas entities
npm run migration:generate src/migrations/NomeDaMigration

# Executar migrations pendentes
npm run migration:run

# Reverter última migration
npm run migration:revert

# Mostrar status das migrations
npm run migration:show
```

## Migrations Atuais

### EmptyValidationMigration1755687676971
- **Status**: ✅ Executada
- **Propósito**: Migration vazia para validação
- **Descrição**: Esta migration marca que o banco de dados está sincronizado com as definições atuais das entities sem realizar alterações no schema. Serve como ponto de partida para futuras migrations.

## Notas Importantes

1. **Banco de Produção**: Como temos um banco de dados em produção, as migrations vazias servem para validar que o schema atual está correto.

2. **Futuras Alterações**: Qualquer alteração nas entities deve gerar uma nova migration:
   ```bash
   npm run migration:generate src/migrations/DescricaoAlteracao
   ```

3. **Ambiente de Desenvolvimento**: As migrations garantem que todos os ambientes tenham o mesmo schema de banco de dados.

4. **Backup Recomendado**: Sempre faça backup do banco antes de executar migrations em produção.

## Exemplo de Uso

```bash
# 1. Verificar status atual
npm run migration:show

# 2. Gerar migration após alterar entities
npm run migration:generate src/migrations/AdicionarCampoNaTask

# 3. Executar migrations pendentes
npm run migration:run

# 4. Verificar se foi executada
npm run migration:show
```