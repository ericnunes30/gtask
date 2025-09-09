#!/bin/sh
# Comandos para inspecionar o banco Postgres do backend-2.
# Os dados de conexão estão em .env (usamos as variáveis do projeto: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE).
# Execute: chmod +x ./db_inspect_commands.sh && ./db_inspect_commands.sh
#
# Nota: este script usa psql. Se estiver no Windows use o psql fornecido pelo PostgreSQL (PowerShell/cmd).
# O script assume que as variáveis de ambiente já estão carregadas (ex: source backend-2/.env) ou que seu shell as exporte.
#
# Exemplos para carregar .env (Linux/macOS):
#   export $(grep -v '^#' backend-2/.env.example | xargs)   # substitua .env.example por seu .env real
#
# Comandos:
: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"
: "${DB_USERNAME:=postgres}"
: "${DB_PASSWORD:=123456}"
: "${DB_DATABASE:=manager_group_test}"

export PGPASSWORD="${DB_PASSWORD}"

# 1) Conectar e listar tabelas no schema público
echo "==> Listando tabelas (public)..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -c "\dt public.*"

# 2) Listar colunas e tipos de uma tabela (substituir TABLE_NAME)
echo "==> Para inspecionar colunas de uma tabela use: ./db_inspect_commands.sh TABLE_NAME"
if [ -n "$1" ]; then
  TABLE="$1"
  echo "==> Colunas da tabela: $TABLE"
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -c "\d+ public.\"${TABLE}\""
fi

# 3) Listar chaves estrangeiras e constraints
echo "==> Listando foreign keys e constraints (padrão public)"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -c "\dF+"

# 4) Buscar join tables comuns detectados nas entidades (users_roles, projects_users, task_user, occupations_projects, occupations_tasks, comment_user_mentions, comment_like)
echo "==> Verificando existência de join tables comuns"
for jt in users_roles projects_users task_user occupations_projects occupations_tasks comment_user_mentions comment_like; do
  echo "-> Verificando table: $jt"
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -c "SELECT to_regclass('public.${jt}') AS exists, (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='${jt}') AS columns_count;"
done

# 5) Listar índices para uma tabela (útil para perfis/uniqueness)
echo "==> Para listar índices de uma tabela: ./db_inspect_commands.sh indexes TABLE_NAME"
if [ "$1" = "indexes" ] && [ -n "$2" ]; then
  T="$2"
  echo "==> Índices da tabela: $T"
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -c "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='${T}';"
fi

# 6) Extrair foreign key relationships (relacionamentos entre tabelas)
echo "==> Relações de chave estrangeira (public)"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -c "SELECT tc.table_schema, tc.table_name, kcu.column_name, ccu.table_schema AS foreign_table_schema, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';"

# 7) DUMP de esquema (somente estrutura) para revisão (essa operação pode gerar um arquivo grande)
echo "==> Gerando dump do esquema (arquivo: db_schema.sql)"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" -s -f db_schema.sql

echo "==> Concluído. Revise os arquivos/saídas acima (db_schema.sql se gerado)."