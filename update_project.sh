#!/bin/bash

# Arquivo de log para depuração
LOG_FILE="$HOME/manager_update.log"

# Função para registrar mensagens no log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
    echo "$1"
}

# Função para verificar erros
check_error() {
    if [ $? -ne 0 ]; then
        log "ERRO: $1"
        exit 1
    fi
}

# Iniciar log
log "Iniciando processo de atualização do Manager Group"

# Configurar Git para não abrir o editor para mensagens de merge
log "Configurando Git para não abrir o editor para mensagens de merge"
git config --global core.editor true
git config --global pull.rebase false

# Ir para o diretório do projeto
cd ~/manager-group
check_error "Falha ao acessar o diretório do projeto"
log "Diretório atual: $(pwd)"

# Verificar arquivos marcados como skip-worktree
log "Arquivos marcados como skip-worktree:"
git ls-files -v | grep ^S >> $LOG_FILE

# Atualizar o código
log "Verificando alterações locais"
git status --porcelain

log "Salvando alterações locais (stash), se houver"
# -u inclui arquivos não rastreados, -m permite uma mensagem para o stash
git stash push -u -m "Autostash by update_project.sh"

log "Atualizando código com git pull"
# Usar --no-edit para evitar que o editor seja aberto para mensagens de merge
git pull --no-edit origin main
check_error "Falha no git pull"

log "Restaurando alterações locais (stash pop), se houver"
# Tenta aplicar o stash. Se falhar (conflito), o usuário precisará resolver manualmente.
git stash pop || log "AVISO: Falha ao aplicar o stash. Pode haver conflitos para resolver manualmente."

# Atualizar o frontend
log "Atualizando frontend"
cd frontend
check_error "Falha ao acessar o diretório frontend"

log "Instalando dependências do frontend"
npm install
check_error "Falha ao instalar dependências do frontend"

log "Construindo frontend"
npm run build
check_error "Falha ao construir frontend"

cd ..
log "Voltando para o diretório raiz"

# Atualizar o backend
log "Atualizando backend"
cd backend
check_error "Falha ao acessar o diretório backend"

log "Instalando dependências do backend"
npm install
check_error "Falha ao instalar dependências do backend"

log "Corrigindo o arquivo env.js para produção"
# Método 1: Substituir o caminho relativo
sed -i 's|new URL('\''../'\''|new URL('\''../../'\''|g' build/start/env.js

# Método 2: Substituir o arquivo inteiro por uma versão corrigida
cat > build/start/env.js << EOL
import { Env } from '@adonisjs/core/env';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const baseUrl = new URL('../../', import.meta.url);

export default await Env.create(baseUrl, {
    NODE_ENV: Env.schema.enum(['development', 'production', 'test']),
    PORT: Env.schema.number(),
    APP_KEY: Env.schema.string(),
    HOST: Env.schema.string({ format: 'host' }),
    LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
    DB_HOST: Env.schema.string({ format: 'host' }),
    DB_PORT: Env.schema.number(),
    DB_USER: Env.schema.string(),
    DB_PASSWORD: Env.schema.string.optional(),
    DB_DATABASE: Env.schema.string()
});
// # sourceMappingURL=env.js.map
EOL
log "Arquivo env.js corrigido para produção"

# Copiar o arquivo .env para o diretório build
log "Copiando o arquivo .env para o diretório build"
cp .env build/.env
log "Arquivo .env copiado para o diretório build"

log "Executando migrações do banco de dados"
node ace migration:run
check_error "Falha ao executar migrações"

cd ..
log "Voltando para o diretório raiz"

# Reiniciar os serviços
log "Reiniciando serviços com PM2"
pm2 restart all
check_error "Falha ao reiniciar serviços"

# Finalizar log
log "Atualização concluída com sucesso!"