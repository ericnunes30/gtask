#!/bin/bash

# Script de instalação - Manager Group
# Este script instala todas as dependências necessárias para o projeto no Ubuntu

set -e  # Para em caso de erro

echo "🚀 Iniciando instalação das dependências do Manager Group..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
sudo apt update -y
sudo apt upgrade -y

# Instalar dependências básicas
echo "🔧 Instalando dependências básicas..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Instalar PostgreSQL
echo "🐘 Instalando PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Configurar PostgreSQL
echo "⚙️ Configurando PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar banco de dados
echo "🗄️ Criando banco de dados..."
sudo -u postgres createdb manager_group_test

# Configurar usuário postgres (opcional - para desenvolvimento)
echo "👤 Configurando usuário postgres..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Instalar PM2 globalmente (para gerenciamento de processos)
echo "🔄 Instalando PM2..."
npm install -g pm2

# Obter diretório atual do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navegar para o diretório do backend e instalar dependências
echo "📁 Instalando dependências do backend..."
cd "$SCRIPT_DIR/backend"
npm install

# Navegar para o diretório do frontend e instalar dependências
echo "🎨 Instalando dependências do frontend..."
cd "$SCRIPT_DIR/frontend"
npm install

# Voltar para o diretório raiz
cd "$SCRIPT_DIR"

# Criar arquivo .env no backend se não existir
echo "📝 Configurando arquivos de ambiente..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "Arquivo .env criado no backend"
fi

# Construir o backend
echo "🔨 Construindo o backend..."
cd "$SCRIPT_DIR/backend"
node ace build

# Corrigir o arquivo env.js para produção (necessário para a API funcionar)
echo "🔧 Corrigindo arquivo env.js para produção..."
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
echo "Arquivo env.js corrigido para produção"

# Copiar o arquivo .env para o diretório build
echo "📋 Copiando arquivo .env para o diretório build..."
cp .env build/.env
echo "Arquivo .env copiado para o diretório build"

# Executar migrações do banco
echo "🔄 Executando migrações do banco de dados..."
node ace migration:run --force
echo "Migrações executadas com sucesso"

# Construir o frontend
echo "🎨 Construindo o frontend..."
cd "$SCRIPT_DIR/frontend"
npm run build
echo "Frontend construído com sucesso"

# Voltar para o backend
cd "$SCRIPT_DIR/backend"

# Limpar cache do npm
echo "🧹 Limpando cache..."
npm cache clean --force

echo "✅ Instalação concluída com sucesso!"
echo "📋 Resumo:"
echo "   - PostgreSQL instalado e configurado"
echo "   - Banco 'manager_group_test' criado"
echo "   - Dependências do backend instaladas"
echo "   - Dependências do frontend instaladas"
echo "   - PM2 instalado para gerenciamento de processos"
echo ""
echo "🚀 Para iniciar o projeto:"
echo "   Backend: cd $SCRIPT_DIR/backend && npm run dev"
echo "   Frontend: cd $SCRIPT_DIR/frontend && npm run dev"
echo ""
echo "🔗 URLs padrão:"
echo "   Frontend: http://localhost:5173"
echo "   Backend: http://localhost:3333"