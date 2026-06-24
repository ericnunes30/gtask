import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';

/**
 * Contrato para resolver quem deve receber notificações a partir de eventos de domínio.
 *
 * Segue o padrão de abstração por contrato (interface segregation), permitindo que
 * consumidores dependam do contrato e não de uma implementação concreta.
 */
export interface NotificationRecipientResolver {
  /**
   * Resolve os destinatários de uma notificação de tarefa criada.
   * @param task A tarefa criada.
   * @param createdBy ID do usuário que criou a tarefa.
   * @returns IDs dos usuários que devem ser notificados.
   */
  getTaskCreatedNotificationRecipients(task: Task, createdBy: number): number[];

  /**
   * Resolve os destinatários de uma notificação de tarefa atualizada.
   * @param task A tarefa atualizada.
   * @param updatedBy ID do usuário que atualizou a tarefa.
   * @returns IDs dos usuários que devem ser notificados.
   */
  getTaskUpdatedNotificationRecipients(task: Task, updatedBy: number): number[];

  /**
   * Resolve os destinatários de uma notificação de mudança de status de tarefa.
   * @param task A tarefa atualizada.
   * @param updatedBy ID do usuário que atualizou a tarefa.
   * @param newStatus Novo status da tarefa.
   * @returns IDs dos usuários que devem ser notificados.
   */
  getTaskStatusUpdatedNotificationRecipients(
    task: Task,
    updatedBy: number,
    newStatus: string,
  ): number[];

  /**
   * Resolve os destinatários de uma notificação de comentário criado.
   * @param comment O comentário criado.
   * @param createdBy ID do usuário que criou o comentário.
   * @returns IDs dos usuários que devem ser notificados.
   */
  getCommentCreatedNotificationRecipients(
    comment: Comment,
    createdBy: number,
  ): number[];
}
