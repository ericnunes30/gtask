#!/bin/bash
# Script para configuração inicial do projeto Manager Group
# Uso: ./setup_project.sh

#############################################
### EDITE ESTAS VARIÁVEIS COM SEUS DADOS ###
#############################################

# Credenciais do GitHub
GITHUB_USER="ericnunes30"
GITHUB_TOKEN="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"  # Deixe em branco para ser solicitado durante a execução ou insira seu token pessoal

# Informações do repositório
REPO_NAME="manager-group"
BRANCH="main"

# Configurações do Git (deixe em branco para usar as configurações globais existentes)
GIT_NAME="Eric"
GIT_EMAIL="ericcontato.nunes@gmail.com"

# Configurações do banco de dados para o arquivo .env
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="C5C6ExGBIhUwocX"
DB_DATABASE="manager_group"

# Configurações do servidor
APP_PORT="3333"
APP_HOST="localhost"
APP_KEY=""  # Será gerado automaticamente se deixado em branco

#############################################
### NÃO EDITE ABAIXO DESTA LINHA ###########
#############################################

INSTALL_DIR=$(pwd)

echo "=== Configuração inicial do projeto Manager Group ==="
echo "Usuário GitHub: $GITHUB_USER"
echo "Repositório: $REPO_NAME"
echo "Branch: $BRANCH"
echo "Diretório de instalação: $INSTALL_DIR"
echo ""

# Configurar Git (apenas se não estiver configurado e valores foram fornecidos)
if [ -z "$(git config --global user.name)" ] && [ ! -z "$GIT_NAME" ]; then
  echo "Configurando Git com os valores fornecidos..."
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  echo "Git configurado com sucesso!"
elif [ -z "$(git config --global user.name)" ]; then
  echo "Configurando Git..."
  read -p "Digite seu nome para o Git: " GIT_NAME_INPUT
  read -p "Digite seu email para o Git: " GIT_EMAIL_INPUT
  git config --global user.name "$GIT_NAME_INPUT"
  git config --global user.email "$GIT_EMAIL_INPUT"
  echo "Git configurado com sucesso!"
fi

# Configurar credencial helper para armazenar credenciais
git config --global credential.helper store
echo "Configurado armazenamento de credenciais Git."

# Clonar o repositório
echo "Clonando o repositório..."
if [ -z "$GITHUB_TOKEN" ]; then
  # Sem token, usa autenticação padrão
  git clone https://github.com/$GITHUB_USER/$REPO_NAME.git -b $BRANCH
else
  # Com token, usa autenticação via token
  git clone https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git -b $BRANCH
fi

if [ $? -ne 0 ]; then
  echo "Falha ao clonar o repositório. Verifique suas credenciais e tente novamente."
  exit 1
fi

cd $REPO_NAME

# Configurar backend
echo "Configurando o backend..."
cd backend

echo "Instalando dependências do backend..."
npm install

# Configurar .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Arquivo .env criado a partir do exemplo."
    
    # Substituir valores no arquivo .env
    sed -i "s|PORT=.*|PORT=$APP_PORT|" .env
    sed -i "s|HOST=.*|HOST=$APP_HOST|" .env
    sed -i "s|DB_HOST=.*|DB_HOST=$DB_HOST|" .env
    sed -i "s|DB_PORT=.*|DB_PORT=$DB_PORT|" .env
    sed -i "s|DB_USER=.*|DB_USER=$DB_USER|" .env
    sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" .env
    sed -i "s|DB_DATABASE=.*|DB_DATABASE=$DB_DATABASE|" .env
    
    # Gerar APP_KEY se não foi fornecida
    if [ -z "$APP_KEY" ]; then
      echo "Gerando APP_KEY..."
      APP_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
      # Verificar se APP_KEY já existe no arquivo
      if grep -q "APP_KEY=" .env; then
        sed -i "s|APP_KEY=.*|APP_KEY=$APP_KEY|" .env
      else
        # Se não existir, adicionar ao final do arquivo
        echo "APP_KEY=$APP_KEY" >> .env
      fi
      echo "APP_KEY gerada e adicionada ao arquivo .env"
    else
      # Verificar se APP_KEY já existe no arquivo
      if grep -q "APP_KEY=" .env; then
        sed -i "s|APP_KEY=.*|APP_KEY=$APP_KEY|" .env
      else
        # Se não existir, adicionar ao final do arquivo
        echo "APP_KEY=$APP_KEY" >> .env
      fi
    fi
    
    echo "Arquivo .env configurado com os valores fornecidos."
    echo "Você pode editar manualmente se necessário:"
    echo "nano $(pwd)/.env"
  else
    echo "AVISO: Arquivo .env.example não encontrado. Criando .env manualmente..."
    cat > .env << EOL
TZ=UTC
PORT=$APP_PORT
HOST=$APP_HOST
LOG_LEVEL=info
APP_KEY=$APP_KEY
NODE_ENV=production
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_DATABASE
EOL
    # Gerar APP_KEY se não foi fornecida
    if [ -z "$APP_KEY" ]; then
      echo "Gerando APP_KEY..."
      APP_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
      sed -i "s|APP_KEY=.*|APP_KEY=$APP_KEY|" .env
      echo "APP_KEY gerada e adicionada ao arquivo .env"
    fi
    echo "Arquivo .env criado com os valores fornecidos."
  fi
fi

# Construir o backend
echo "Construindo o backend..."
node ace build

# Corrigir o arquivo env.js para produção
echo "Corrigindo o arquivo env.js para produção..."
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

echo "Arquivo env.js corrigido para produção."

# Copiar o arquivo .env para o diretório build
echo "Copiando o arquivo .env para o diretório build..."
cp .env build/.env
echo "Arquivo .env copiado para o diretório build."

# Adicionar um aviso sobre possível problema com .env em produção
echo ""
echo "NOTA: O script aplicou correções para resolver problemas com variáveis de ambiente em produção:"
echo "1. Corrigiu o caminho no arquivo build/start/env.js"
echo "2. Copiou o arquivo .env para o diretório build/"
echo "3. Garantiu que a APP_KEY foi gerada e adicionada ao arquivo .env"
echo ""

# Executar migrações
read -p "Deseja executar as migrações do banco de dados? (s/n): " RUN_MIGRATIONS
if [[ $RUN_MIGRATIONS == "s" || $RUN_MIGRATIONS == "S" ]]; then
  echo "Executando migrações..."
  node ace migration:run
fi

# Executar seeders
read -p "Deseja executar os seeders? (s/n): " RUN_SEEDERS
if [[ $RUN_SEEDERS == "s" || $RUN_SEEDERS == "S" ]]; then
  echo "Executando seeders..."
  node ace db:seed
fi

# Configurar PM2
if ! command -v pm2 &> /dev/null; then
  echo "Instalando PM2 globalmente..."
  npm install -g pm2
fi

# Criar ou atualizar o arquivo ecosystem.config.cjs para PM2
echo "Criando arquivo de configuração para PM2..."
cat > ecosystem.config.cjs << EOL
module.exports = {
  apps: [
    {
      name: 'manager-group-backend',
      script: './build/bin/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
EOL
echo "Arquivo ecosystem.config.cjs criado com sucesso."

# Iniciar o backend com PM2
echo "Iniciando o backend com PM2..."
if [ -f "ecosystem.config.cjs" ]; then
  pm2 start ecosystem.config.cjs
elif [ -f "ecosystem.config.js" ]; then
  # Compatibilidade com versões anteriores
  pm2 start ecosystem.config.js
else
  pm2 start npm --name "manager-group-backend" -- start
fi
pm2 save

# Configurar frontend
echo "Configurando o frontend..."
cd ../frontend

echo "Instalando dependências do frontend..."
npm install

echo "Construindo o frontend..."
npm run build

# Voltar para o diretório do backend para garantir que PM2 está rodando corretamente
echo "Verificando status do PM2 no backend..."
cd ../backend
pm2 status

# Instruções para configurar o servidor web
echo ""
echo "=== Configuração concluída com sucesso! ==="
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Configure seu servidor web (Nginx/Apache) para servir os arquivos estáticos do frontend:"
echo "   - Diretório do frontend: $(pwd)/../frontend/dist"
echo ""
echo "2. Verifique se o backend está rodando:"
echo "   - pm2 status"
echo ""
echo "3. Para visualizar logs do backend:"
echo "   - pm2 logs manager-group-backend"
echo ""

# Voltar ao diretório inicial
cd $INSTALL_DIR

echo "Script concluído!"




