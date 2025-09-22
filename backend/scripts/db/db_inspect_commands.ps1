# PowerShell script atualizado para inspecionar o banco Postgres do backend-2
# Corrigido erro de referência de variável que causava falha na execução.
# Uso:
# 1) Defina as variáveis de ambiente no PowerShell, por exemplo:
#      $env:DB_HOST = "localhost"
#      $env:DB_PORT = "5432"
#      $env:DB_USERNAME = "postgres"
#      $env:DB_PASSWORD = "your-password"
#      $env:DB_DATABASE = "manager_team2"
#
# 2) Execute:
#      pwsh .\db_inspect_commands.ps1
#
# Parâmetros opcionais:
#   -Table <table_name>    => mostra detalhes da tabela especificada
#   -Mode indexes -Table <table_name> => lista índices da tabela

param(
  [string]$Table = "",
  [string]$Mode = ""
)

# Ler variáveis de ambiente (com fallback)
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USERNAME = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "postgres" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "123456" }
$DB_DATABASE = if ($env:DB_DATABASE) { $env:DB_DATABASE } else { "manager_group_test" }

$env:PGPASSWORD = $DB_PASSWORD

Write-Host ("Using connection: {0}@{1}:{2}/{3}" -f $DB_USERNAME, $DB_HOST, $DB_PORT, $DB_DATABASE)

function Exec-PSQL([string]$query) {
  $argsList = @("-h", $DB_HOST, "-p", $DB_PORT, "-U", $DB_USERNAME, "-d", $DB_DATABASE, "-c", $query)
  Write-Host "==> Executing: psql $($argsList -join ' ')"
  & psql @argsList
  if ($LASTEXITCODE -ne 0) {
    Write-Host "psql exited with code $LASTEXITCODE" -ForegroundColor Red
  }
}

# 1) Listar tabelas no schema public
Write-Host "==> Listing tables (public)..."
Exec-PSQL "\dt public.*"

# 2) Se foi passado um nome de tabela, mostrar colunas e detalhes
if ($Table -ne "") {
  Write-Host ("==> Table details: {0}" -f $Table)
  Exec-PSQL ("\d+ public.`"" + $Table + "`"")
}

# 3) Listar foreign keys e constraints
Write-Host "==> Listing foreign keys and constraints (public)"
$fkQuery = @"
SELECT tc.table_schema, tc.table_name, kcu.column_name, ccu.table_schema AS foreign_table_schema,
       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
"@
Exec-PSQL $fkQuery

# 4) Verificar existência de join tables detectadas nas entidades
$joinTables = @("users_roles","projects_users","task_user","occupations_projects","occupations_tasks","comment_user_mentions","comment_like")
Write-Host "==> Checking common join tables"
foreach ($jt in $joinTables) {
  Write-Host ("-> Checking table: {0}" -f $jt)
  $q = "SELECT to_regclass('public." + $jt + "') AS exists, (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='" + $jt + "') AS columns_count;"
  Exec-PSQL $q
}

# 5) Listar índices para uma tabela (quando solicitado)
if (($Mode -eq "indexes") -and ($Table -ne "")) {
  Write-Host ("==> Indexes for table: {0}" -f $Table)
  $idxQ = "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='" + $Table + "';"
  Exec-PSQL $idxQ
}

# 6) Gerar dump do esquema (estrutura somente) — cria db_schema.sql no diretório atual
Write-Host "==> Generating schema dump (file: db_schema.sql) — may overwrite existing file"
$pgDumpArgs = @("-h", $DB_HOST, "-p", $DB_PORT, "-U", $DB_USERNAME, "-d", $DB_DATABASE, "-s", "-f", "db_schema.sql")
Write-Host ("==> Executing: pg_dump {0}" -f ($pgDumpArgs -join ' '))
& pg_dump @pgDumpArgs
if ($LASTEXITCODE -ne 0) {
  Write-Host "pg_dump exited with code $LASTEXITCODE" -ForegroundColor Red
} else {
  Write-Host "==> db_schema.sql generated successfully."
}

Write-Host "==> Done. Review db_schema.sql and the outputs above."