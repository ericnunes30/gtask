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

# Ir para o diretório do projeto
cd ~/manager-group
check_error "Falha ao acessar o diretório do projeto"
log "Diretório atual: $(pwd)"

# Verificar arquivos marcados como skip-worktree
log "Arquivos marcados como skip-worktree:"
git ls-files -v | grep ^S >> $LOG_FILE

# Atualizar o código
log "Atualizando código com git pull"
git pull origin main
check_error "Falha no git pull"

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