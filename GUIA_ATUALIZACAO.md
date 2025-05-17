# Guia de Atualização do Manager Group

## Atualização na VPS (Preservando a Configuração da API)

### Configuração Inicial (Apenas Uma Vez)

Para preservar permanentemente a configuração da rota da API no arquivo axios:

1. **Marque o arquivo de configuração do axios para ser ignorado nas atualizações**:
   ```bash
   git update-index --skip-worktree frontend/src/lib/api/axios.ts
   ```

2. **Verifique se o arquivo foi marcado corretamente**:
   ```bash
   git ls-files -v | grep ^S
   ```
   Você deve ver o arquivo axios.ts na lista com um "S" na frente.

### Processo de Atualização (Cada Vez)

Após a configuração inicial, siga estes passos para atualizar o projeto:

1. **Atualize o código**:
   ```bash
   # Para evitar que o editor nano seja aberto para mensagens de merge
   git pull --no-edit origin main
   ```
   O Git não vai sobrescrever o arquivo axios.ts, mantendo sua configuração personalizada.

   **Dica**: Para configurar o Git permanentemente para não abrir o editor:
   ```bash
   # Configurar um editor que não faz nada
   git config --global core.editor true

   # Configurar a estratégia de merge para não usar rebase
   git config --global pull.rebase false
   ```

2. **Atualize o Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **Atualize o Backend**:
   ```bash
   cd backend
   npm install
   node ace migration:run
   cd ..
   ```

4. **Reinicie os serviços**:
   ```bash
   pm2 restart all
   ```

> **Importante**: Faça backup do banco de dados antes de executar migrações.

> **Nota**: Não é necessário remover a versão antiga antes de executar uma nova build.

## Envio de Alterações para o GitHub

### Push sem Merge (Evitando Conflitos)

Para enviar suas alterações locais para o GitHub sem precisar fazer merge:

```bash
# Certifique-se de estar na branch correta
git checkout main

# Adicione suas alterações
git add .

# Faça o commit das alterações
git commit -m "Correção de no Task Modal Details na pagina de Task- Tela ficava piscando e travava ao fechar a visualização de uma tarefa"

# Faça o push forçado (use com cuidado!)
git push --force-with-lease origin main
```

> **Atenção**: O comando `--force-with-lease` é mais seguro que `--force` pois verifica se não houve alterações remotas que você não tenha baixado. Use com cuidado para não sobrescrever o trabalho de outras pessoas.

Alternativamente, se preferir uma abordagem mais segura:

```bash
# Puxe as alterações remotas primeiro
git pull --rebase origin main

# Resolva conflitos se necessário

# Faça o push normalmente
git push origin main
```

## Solução de Problemas

### Se o Git Pull Falhar
```bash
git stash save "Alterações locais"
git pull origin main
git stash apply
```

### Se o Serviço Não Reiniciar
```bash
pm2 stop [serviço]
pm2 start [serviço]
```

### Verificação Rápida
```bash
# Status dos serviços
pm2 status

# Logs
pm2 logs backend
pm2 logs frontend
```

### Problema com Variáveis de Ambiente no PM2

Se você encontrar erros relacionados a variáveis de ambiente ausentes quando executar o backend com PM2, como:
```
Missing environment variable "DB_DATABASE"
```

Isso ocorre porque o arquivo `env.js` compilado não está encontrando o arquivo `.env` corretamente. Para resolver:

1. **Corrija o arquivo `env.js` após a build**:
   ```bash
   # Substitua o arquivo env.js por uma versão corrigida
   cat > backend/build/start/env.js << EOL
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
   EOL
   ```

2. **Copie o arquivo `.env` para o diretório build**:
   ```bash
   cp backend/.env backend/build/.env
   ```

3. **Reinicie o PM2**:
   ```bash
   pm2 restart all
   ```

> **Nota**: O script `update_project.sh` já inclui essas correções automaticamente.

### Erros de MIME Type no Servidor Web

Se encontrar erros como:
```
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".
```

Ou:
```
Refused to apply style from '...' because its MIME type ('text/html') is not a supported stylesheet MIME type.
```

Estes erros indicam que o servidor web não está configurado corretamente para servir arquivos CSS e JavaScript com os tipos MIME corretos.

#### Solução Rápida (Temporária)

1. Edite o arquivo `frontend/index.html` para remover o script do GPT Engineer:
   ```bash
   # Remova ou comente a linha
   <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
   ```

2. Reconstrua o frontend:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

3. Reinicie os serviços:
   ```bash
   pm2 restart all
   ```

#### Solução Permanente (Configuração do Servidor Web)

Para Nginx:

1. Edite o arquivo de configuração do Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/seu-site.conf
   ```

2. Adicione ou verifique os tipos MIME:
   ```nginx
   http {
       include /etc/nginx/mime.types;
       # ... outras configurações ...
   }

   server {
       # ... outras configurações ...

       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires max;
           try_files $uri =404;
       }
   }
   ```

3. Reinicie o Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

Para Apache:

1. Crie ou edite o arquivo `.htaccess` na raiz do diretório do frontend:
   ```
   <IfModule mod_mime.c>
       AddType text/css .css
       AddType application/javascript .js
       AddType application/javascript .mjs
   </IfModule>
   ```

2. Reinicie o Apache:
   ```bash
   sudo systemctl restart apache2
   ```

### Boas Práticas de UI
- Remova completamente elementos desnecessários (não apenas esconda com CSS)
- Posicione o botão Cancelar à esquerda do botão Salvar, no mesmo nível

