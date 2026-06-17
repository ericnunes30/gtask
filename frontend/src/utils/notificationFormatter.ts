// Utility to format structured notifications (PT-BR)

type AnyNotification = {
  id?: number | string;
  type?: string;
  data?: any;
  metadata?: any;
  createdAt?: string | Date;
};

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  a_fazer: 'A Fazer',
  em_andamento: 'Em Andamento',
  em_revisao: 'Em Revisão',
  aguardando_cliente: 'Aguardando Cliente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const priorityLabel: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

const fieldLabel: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  status: 'Status',
  priority: 'Prioridade',
  start_date: 'Data de Início',
  due_date: 'Data de Entrega',
  order: 'Ordem',
};

function formatDate(value: any): string {
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (!(d instanceof Date) || isNaN(d.getTime())) return String(value ?? '');
  try {
    return d.toLocaleDateString('pt-BR');
  } catch {
    return d.toISOString().split('T')[0];
  }
}

function formatValue(field: string, value: any): string {
  if (value === null || value === undefined) return '—';
  if (field === 'status') return statusLabel[String(value)] || String(value);
  if (field === 'priority') return priorityLabel[String(value)] || String(value);
  if (field === 'start_date' || field === 'due_date') return formatDate(value);
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function formatNotification(n: AnyNotification): { title: string; message: string } {
  const type = String(n.type || '').toLowerCase();
  const data = n.data || {};

  // task.created
  if (type.includes('task.created')) {
    const actor = data.actorName || 'Alguém';
    const task = data.taskTitle || 'tarefa';
    const project = data.projectTitle ? ` no projeto ${data.projectTitle}` : '';
    return {
      title: 'Tarefa criada',
      message: `${actor} criou a tarefa ${task}${project}.`,
    };
  }

  // task.status.changed
  if (type.includes('task.status.changed')) {
    const actor = data.actorName || 'Alguém';
    const task = data.taskTitle || 'tarefa';
    const status = statusLabel[String(data.newStatus)] || data.newStatus || '';
    return {
      title: 'Status alterado',
      message: `${actor} moveu a tarefa ${task} para ${status}.`,
    };
  }

  // comment.created
  if (type.includes('comment.created')) {
    const actor = data.actorName || 'Alguém';
    const task = data.taskTitle || 'tarefa';
    const snippet = data.commentSnippet ? `: "${data.commentSnippet}"` : '';
    return {
      title: 'Novo comentário',
      message: `${actor} comentou em ${task}${snippet}`,
    };
  }

  // task.updated
  if (type.includes('task.updated')) {
    const actor = data.actorName || 'Alguém';
    const task = data.taskTitle || 'tarefa';
    const changes: Array<{ field: string; oldValue?: any; newValue?: any }> = Array.isArray(data.changedFields)
      ? data.changedFields
      : [];
    const parts = changes.slice(0, 3).map((c) => {
      const label = fieldLabel[c.field] || c.field;
      const newVal = formatValue(c.field, c.newValue);
      const oldVal = c.oldValue !== undefined ? formatValue(c.field, c.oldValue) : undefined;
      return oldVal !== undefined ? `${label}: ${oldVal} → ${newVal}` : `${label}: ${newVal}`;
    });
    const suffix = parts.length > 0 ? ` ${parts.join(' | ')}` : '';
    return {
      title: 'Tarefa atualizada',
      message: `${actor} atualizou a tarefa ${task}.${suffix}`,
    };
  }

  // Legacy/unknown
  return {
    title: 'Notificação',
    message: '',
  };
}
