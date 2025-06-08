# **Plano de Ação: Migração para "Server State" com TanStack Query**

Este documento descreve um plano de ação estruturado para refatorar a camada de comunicação com a API do frontend, migrando da gestão manual de estado com useState e useEffect para uma arquitetura robusta de "Server State" utilizando a biblioteca **TanStack Query**.

A abordagem prioriza a segurança e a integridade funcional, implementando a nova lógica em paralelo com a existente antes de realizar a substituição final.

### **Estrutura de Pastas Alvo**

A seguinte estrutura será adotada para organizar a lógica de acesso a dados:

src/  
├── components/  
├── pages/  
├── hooks/  
├── contexts/  
└── services/       // Camada de comunicação com a API  
    └── backend/  
        ├── projects/  
        │   └── index.ts  // Agrupa hooks: useGetProjects, useCreateProject  
        ├── tasks/  
        │   └── index.ts  // Agrupa hooks: useGetTasks, useUpdateTask  
        └── ... (outras entidades)

### **Fase 0: Configuração do Ambiente**

**Objetivo:** Preparar o projeto com as ferramentas necessárias, sem alterar nenhuma funcionalidade existente.

1. **Instalar Dependências:**  
   * Adicionar as bibliotecas @tanstack/react-query e @tanstack/react-query-devtools ao arquivo package.json do frontend.  
2. **Injetar o Provedor Global:**  
   * **Arquivo:** src/main.tsx  
   * **Ação:** Envolver o componente \<App /\> com o \<QueryClientProvider\>. É crucial criar uma única instância de QueryClient para ser passada como prop a este provedor, garantindo um cache único para toda a aplicação.  
3. **Adicionar Ferramentas de Desenvolvimento:**  
   * **Arquivo:** src/App.tsx (ou no componente de layout principal, ex: AppLayout.tsx).  
   * **Ação:** Renderizar o componente \<ReactQueryDevtools initialIsOpen={false} /\> no final do componente. Esta ferramenta visual será fundamental para depurar e entender o comportamento do cache e o ciclo de vida das requisições.

### **Fase 1: Piloto de Leitura (Página de Projetos)**

**Objetivo:** Refatorar uma página de leitura de dados para validar o novo padrão de forma segura.

1. **Criar o Arquivo de Serviço:**  
   * **Novo Arquivo:** src/services/backend/projects/index.ts  
   * **Propósito:** Centralizar todos os hooks relacionados à entidade "Projeto".  
2. **Definir o Hook de Leitura (useGetProjects):**  
   * **Arquivo:** src/services/backend/projects/index.ts  
   * **Conceito:** Exportar um custom hook useGetProjects que encapsula o useQuery do TanStack.  
     * **queryKey**: \['projects'\] (Um identificador único para os dados em cache).  
     * **queryFn**: A função que executa a busca, chamando o método Axios já existente (ex: api.projects.getAll).  
3. **Refatorar a Página Projects.tsx (Método Seguro):**  
   * **Arquivo:** src/pages/Projects.tsx  
   * **Passos:**  
     1. **Manter Lógica Antiga:** Não remova a lógica existente de useState e useEffect.  
     2. **Adicionar Lógica Nova:** Importe e chame o novo hook useGetProjects().  
     3. **Comparar Resultados:** Use console.log para verificar lado a lado os dados, isLoading e error do método antigo e do novo hook, garantindo que se comportam de maneira similar.  
     4. **Troca Controlada:** Após validar a consistência, comente a lógica antiga e substitua as variáveis no JSX pelas que são retornadas pelo useGetProjects (data, isLoading, isError).  
     5. **Teste Final:** Valide a funcionalidade completa da página: exibição da lista, estado de carregamento e mensagem de erro.  
     6. **Remoção Final:** Somente após a validação bem-sucedida, remova o código antigo que foi comentado.

### **Fase 2: Piloto de Escrita (Formulário de Projeto)**

**Objetivo:** Aplicar o padrão para operações de escrita (criar/atualizar) e validar o fluxo de revalidação automática do cache.

1. **Definir o Hook de Mutação (useCreateProject):**  
   * **Arquivo:** src/services/backend/projects/index.ts  
   * **Conceito:** Exportar um novo hook useCreateProject que encapsula o useMutation.  
     * **mutationFn**: A função que envia os dados para a API (ex: api.projects.create).  
     * **onSuccess**: O passo chave. Configurar este callback para, após o sucesso da mutação, invalidar o cache da lista de projetos usando queryClient.invalidateQueries({ queryKey: \['projects'\] }). Isso força o TanStack a buscar novamente a lista, atualizando a UI automaticamente.  
2. **Refatorar o Formulário ProjectForm.tsx (Método Seguro):**  
   * **Arquivo:** src/components/forms/ProjectForm.tsx  
   * **Passos:**  
     1. **Manter Lógica Antiga:** Não altere a função de submissão onSubmit existente.  
     2. **Adicionar Lógica Nova:** Chame o useCreateProject() no topo do componente.  
     3. **Criar Fluxo de Teste:** Crie um manipulador de evento temporário (ou um segundo botão) para chamar a nova função mutate(data).  
     4. **Verificar Fluxo Completo:** Teste a criação do projeto através do novo fluxo. Confirme se o item é criado no backend e, crucialmente, se a lista de projetos na página principal é atualizada automaticamente.  
     5. **Substituição:** Uma vez validado, altere a função onSubmit principal para usar exclusivamente o mutate(data) e controle o estado de carregamento do formulário com a variável isPending retornada pelo hook.  
     6. **Remoção Final:** Apague o código antigo da chamada direta à API e os fluxos de teste.

### **Fase 3: Roteiro de Migração Completa**

**Objetivo:** Expandir o padrão validado para toda a aplicação de forma sistemática e organizada.

1. **Mapear e Criar Arquivos de Serviço:**  
   * Crie os arquivos de serviço (index.ts) restantes dentro de src/services/backend/ para cada entidade da aplicação (tasks, users, comments, etc.).  
2. **Migrar por Prioridade (Aplicando o Método Seguro):**  
   * **Prioridade 1 (Leituras):** Refatore todas as telas e componentes que apenas exibem dados (lista de tarefas, lista de usuários), seguindo o método da **Fase 1**.  
   * **Prioridade 2 (Escritas):** Refatore todos os formulários e ações de criação, edição e exclusão, seguindo o método da **Fase 2**.  
   * **Prioridade 3 (Componentes Complexos):** Refatore componentes de alta interatividade, como o **Kanban (KanbanBoard.tsx)**. A lógica de arrastar e soltar uma tarefa para atualizar seu status será simplificada para uma única chamada a um hook useUpdateTask.mutate({ taskId, newStatus }), reduzindo drasticamente a complexidade local do componente.  
3. **Limpeza Final:**  
   * Após a migração de todas as entidades, revise a pasta src/hooks para identificar e remover custom hooks que se tornaram obsoletos (aqueles cuja única finalidade era gerenciar o ciclo de vida de requisições com useEffect). O resultado será uma base de código mais limpa, declarativa e de fácil manutenção.
