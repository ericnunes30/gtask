# Guia de Atualização do Manager Group

Este guia contém instruções para atualizar o projeto e resolver problemas comuns durante o desenvolvimento.

## Atualização do Código

### Método Padrão
Para atualizar seu código local com as últimas alterações do repositório remoto:

```bash
git pull origin main
```

### Push sem Fazer Merge

Se você precisa enviar suas alterações para o repositório remoto sem fazer merge com as alterações existentes, siga estas etapas:

1. Primeiro, salve suas alterações locais:
   ```bash
   git add .
   git commit -m "Sua mensagem de commit"
   ```

2. Para fazer push sem precisar fazer merge, use a opção `--force-with-lease`:
   ```bash
   git push --force-with-lease origin main
   ```

   > **ATENÇÃO**: Use `--force-with-lease` em vez de `--force` para evitar sobrescrever acidentalmente alterações que você não conhece.

3. Alternativamente, se você está trabalhando em uma branch separada:
   ```bash
   git checkout -b minha-branch
   git add .
   git commit -m "Sua mensagem de commit"
   git push origin minha-branch
   ```

## Resolução de Problemas Comuns

### Conflitos de Merge
Se você encontrar conflitos de merge durante um pull:

1. Resolva os conflitos manualmente editando os arquivos afetados
2. Adicione os arquivos resolvidos:
   ```bash
   git add .
   ```
3. Complete o merge:
   ```bash
   git commit
   ```

### Reverter para um Estado Anterior
Se precisar voltar para um estado anterior do código:

```bash
git log  # Para encontrar o ID do commit
git reset --hard <commit-id>
```

### Atualização do Frontend

Após atualizar o código, certifique-se de:

1. Instalar novas dependências:
   ```bash
   cd frontend
   npm install
   ```

2. Reconstruir o projeto:
   ```bash
   npm run build
   ```

3. Iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Atualização do Backend

1. Instalar novas dependências:
   ```bash
   cd backend
   npm install
   ```

2. Executar migrações do banco de dados (se houver):
   ```bash
   node ace migration:run
   ```

3. Iniciar o servidor:
   ```bash
   npm run dev
   ```

## Problemas Conhecidos e Soluções

### Botão Salvar no Popup de Adicionar Tarefa
Se o botão Salvar no popup de adicionar tarefa não estiver funcionando:
- Verifique se o ID `task-form-submit` está presente no botão de submit oculto no formulário
- Certifique-se de que o botão Salvar externo está usando o ID correto para encontrar o botão de submit

### Problemas de UI
- Sempre remova completamente elementos de UI desnecessários em vez de apenas escondê-los com CSS
- Posicione o botão Cancelar à esquerda e no mesmo nível horizontal e vertical que o botão Salvar
