/*
 * 📚 EXEMPLOS PRÁTICOS DA NOVA ARQUITETURA DE MODAIS
 * 
 * Este arquivo contém exemplos reais de uso dos novos componentes
 * refatorados, servindo como referência para desenvolvimento futuro.
 */

import React, { useState } from 'react';
import { BaseModal } from '@/components/common/BaseModal';
import { LazyTaskDetailsModal } from '@/components/tasks/LazyTaskDetailsModal';
import { TaskModalProvider } from '@/contexts/TaskModalContext';
import { useModal } from '@/hooks/useModal';
import { Button } from '@/components/ui/button';
import { Task } from '@/common/types';

// =============================================================================
// EXEMPLO 1: Modal Básico Simples
// =============================================================================

export const BasicModalExample: React.FC = () => {
  const modal = useModal();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Exemplo 1: Modal Básico</h3>
      
      <Button onClick={modal.open}>
        Abrir Modal Simples
      </Button>
      
      <BaseModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title="Modal de Exemplo"
        description="Este é um exemplo de modal básico usando os novos componentes."
        size="md"
      >
        <div className="space-y-4">
          <p>Este modal usa o componente BaseModal reutilizável.</p>
          <p>Ele suporta diferentes tamanhos, títulos, descrições e configurações de fechamento.</p>
          
          <div className="flex gap-2">
            <Button onClick={modal.close}>Fechar</Button>
            <Button variant="outline">Cancelar</Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

// =============================================================================
// EXEMPLO 2: Múltiplos Modais Independentes
// =============================================================================

export const MultipleModalsExample: React.FC = () => {
  const confirmModal = useModal();
  const editModal = useModal();
  const infoModal = useModal();

  const handleConfirm = () => {
    console.log('Ação confirmada');
    confirmModal.close();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Exemplo 2: Múltiplos Modais</h3>
      
      <div className="flex gap-2">
        <Button onClick={confirmModal.open} variant="destructive">
          Modal de Confirmação
        </Button>
        <Button onClick={editModal.open}>
          Modal de Edição
        </Button>
        <Button onClick={infoModal.open} variant="outline">
          Modal de Informação
        </Button>
      </div>

      {/* Modal de Confirmação */}
      <BaseModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.close}
        title="Confirmar Ação"
        description="Esta ação não pode ser desfeita."
        size="sm"
      >
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={confirmModal.close}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Confirmar
          </Button>
        </div>
      </BaseModal>

      {/* Modal de Edição */}
      <BaseModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Editar Item"
        size="lg"
      >
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Nome do item"
            className="w-full p-2 border rounded"
          />
          <textarea 
            placeholder="Descrição"
            className="w-full p-2 border rounded h-24"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={editModal.close}>
              Cancelar
            </Button>
            <Button onClick={editModal.close}>
              Salvar
            </Button>
          </div>
        </div>
      </BaseModal>

      {/* Modal de Informação */}
      <BaseModal
        isOpen={infoModal.isOpen}
        onClose={infoModal.close}
        title="Informações do Sistema"
        size="md"
      >
        <div className="space-y-2">
          <p><strong>Versão:</strong> 2.0.0</p>
          <p><strong>Última Atualização:</strong> {new Date().toLocaleDateString()}</p>
          <p><strong>Status:</strong> Online</p>
        </div>
      </BaseModal>
    </div>
  );
};

// =============================================================================
// EXEMPLO 3: Modal de Tarefa com Lazy Loading
// =============================================================================

export const TaskModalExample: React.FC = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [timerRunningTaskId, setTimerRunningTaskId] = useState<string | null>(null);
  const [currentTimerValues, setCurrentTimerValues] = useState<Record<string, number>>({});
  const modal = useModal();

  const mockTasks = [
    { id: 1, title: 'Implementar nova funcionalidade' },
    { id: 2, title: 'Corrigir bug de performance' },
    { id: 3, title: 'Revisar documentação' }
  ];

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    modal.open();
  };

  const handleModalClose = () => {
    setSelectedTaskId(null);
    modal.close();
  };

  const handleTaskUpdated = () => {
    console.log('Tarefa foi atualizada, recarregar lista');
  };

  const handleDuplicateTask = async (task: Task) => {
    console.log('Duplicar tarefa:', task);
    modal.close();
  };

  return (
    <TaskModalProvider>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Exemplo 3: Modal de Tarefa com Lazy Loading</h3>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Clique em uma tarefa para abrir o modal com lazy loading automático.
          </p>
          
          {mockTasks.map(task => (
            <div
              key={task.id}
              className="p-3 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleTaskClick(task.id)}
            >
              <div className="font-medium">{task.title}</div>
              <div className="text-sm text-muted-foreground">ID: {task.id}</div>
            </div>
          ))}
        </div>

        {/* Modal com lazy loading automático */}
        <LazyTaskDetailsModal
          isOpen={modal.isOpen}
          onClose={handleModalClose}
          taskId={selectedTaskId}
          onTaskUpdated={handleTaskUpdated}
          timerRunningTaskId={timerRunningTaskId}
          currentTimerValues={currentTimerValues}
          setCurrentTimerValues={setCurrentTimerValues}
          setTimerRunningTaskId={setTimerRunningTaskId}
          onDuplicateTask={handleDuplicateTask}
        />
      </div>
    </TaskModalProvider>
  );
};

// =============================================================================
// EXEMPLO 4: Modal com Diferentes Tamanhos
// =============================================================================

export const ModalSizesExample: React.FC = () => {
  const [currentSize, setCurrentSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');
  const modal = useModal();

  const sizes = [
    { key: 'sm', label: 'Pequeno (sm)' },
    { key: 'md', label: 'Médio (md)' },
    { key: 'lg', label: 'Grande (lg)' },
    { key: 'xl', label: 'Extra Grande (xl)' },
    { key: 'full', label: 'Tela Cheia (full)' }
  ] as const;

  const openModal = (size: typeof currentSize) => {
    setCurrentSize(size);
    modal.open();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Exemplo 4: Diferentes Tamanhos de Modal</h3>
      
      <div className="flex flex-wrap gap-2">
        {sizes.map(size => (
          <Button
            key={size.key}
            onClick={() => openModal(size.key)}
            variant="outline"
          >
            {size.label}
          </Button>
        ))}
      </div>

      <BaseModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={`Modal ${sizes.find(s => s.key === currentSize)?.label}`}
        size={currentSize}
      >
        <div className="space-y-4">
          <p>Este é um modal de tamanho <strong>{currentSize}</strong>.</p>
          <p>O componente BaseModal suporta 5 tamanhos diferentes:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>sm:</strong> max-w-md (pequeno)</li>
            <li><strong>md:</strong> max-w-lg (médio - padrão)</li>
            <li><strong>lg:</strong> max-w-2xl (grande)</li>
            <li><strong>xl:</strong> max-w-4xl (extra grande)</li>
            <li><strong>full:</strong> max-w-[95vw] (quase tela cheia)</li>
          </ul>
        </div>
      </BaseModal>
    </div>
  );
};

// =============================================================================
// EXEMPLO 5: Modal com Footer Customizado
// =============================================================================

export const CustomFooterModalExample: React.FC = () => {
  const modal = useModal();
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = () => {
    console.log('Dados do formulário:', formData);
    modal.close();
    setFormData({ name: '', email: '' });
  };

  const footerContent = (
    <div className="flex justify-between w-full">
      <Button variant="outline" onClick={modal.close}>
        Cancelar
      </Button>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setFormData({ name: '', email: '' })}>
          Limpar
        </Button>
        <Button onClick={handleSubmit}>
          Salvar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Exemplo 5: Modal com Footer Customizado</h3>
      
      <Button onClick={modal.open}>
        Abrir Modal com Footer
      </Button>

      <BaseModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title="Formulário de Contato"
        description="Preencha os dados abaixo"
        size="md"
        footer={footerContent}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Seu nome completo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="seu@email.com"
            />
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

// =============================================================================
// EXEMPLO PRINCIPAL: Showcase de Todos os Exemplos
// =============================================================================

export const ModalExamplesShowcase: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🚀 Nova Arquitetura de Modais</h1>
        <p className="text-muted-foreground">
          Exemplos práticos dos componentes refatorados
        </p>
      </div>

      <div className="grid gap-8">
        <div className="p-6 border rounded-lg">
          <BasicModalExample />
        </div>

        <div className="p-6 border rounded-lg">
          <MultipleModalsExample />
        </div>

        <div className="p-6 border rounded-lg">
          <TaskModalExample />
        </div>

        <div className="p-6 border rounded-lg">
          <ModalSizesExample />
        </div>

        <div className="p-6 border rounded-lg">
          <CustomFooterModalExample />
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>✅ Todos os exemplos usam a nova arquitetura modular</p>
        <p>⚡ Lazy loading automático • 🧪 Componentes testáveis • 🔄 100% reutilizáveis</p>
      </div>
    </div>
  );
};

export default ModalExamplesShowcase;