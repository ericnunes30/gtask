#!/bin/bash

# Script para corrigir problemas com o build do backend
# Este script deve ser executado após 'node ace build'

echo "Corrigindo o build do backend..."

# Verificar se o diretório build existe
if [ ! -d "build" ]; then
  echo "Erro: Diretório 'build' não encontrado. Execute 'node ace build' primeiro."
  exit 1
fi

# 1. Copiar o arquivo .env para o diretório build
echo "Copiando o arquivo .env para o diretório build..."
cp .env build/.env
echo "Arquivo .env copiado."

# 2. Corrigir o caminho no arquivo env.js
echo "Corrigindo o arquivo env.js..."
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
echo "Arquivo env.js corrigido."

echo "Build corrigido com sucesso!"
echo "Agora você pode reiniciar o PM2 com 'pm2 restart all'"
