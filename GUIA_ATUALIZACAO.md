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
   git pull origin main
   ```
   O Git não vai sobrescrever o arquivo axios.ts, mantendo sua configuração personalizada.

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
git commit -m "Correção de caminho do teams e users"

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

### Erro de MIME Type em Módulos JavaScript

Se encontrar o erro:
```
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".
```

Siga estes passos:

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

### Boas Práticas de UI
- Remova completamente elementos desnecessários (não apenas esconda com CSS)
- Posicione o botão Cancelar à esquerda do botão Salvar, no mesmo nível
