import { Injectable } from '@nestjs/common';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { NotificationRecipientResolver } from '../../notification/interfaces/notification-recipient-resolver.interface';

@Injectable()
export class NotificationRecipientService
  implements NotificationRecipientResolver
{
  /**
   * Determina quais usuários devem receber notificações para um evento de criação de tarefa
   * @param task A tarefa criada
   * @param createdBy O ID do usuário que criou a tarefa
   * @returns Array de IDs de usuários que devem ser notificados
   */
  getTaskCreatedNotificationRecipients(
    task: Task,
    createdBy: number,
  ): number[] {
    // Apenas usuários diretamente atribuídos à tarefa, excluindo o criador
    const userIds =
      task.users?.map((user) => user.id).filter((id) => id !== createdBy) || [];
    return userIds;
  }

  /**
   * Determina quais usuários devem receber notificações para um evento de comentário criado
   * @param comment O comentário criado
   * @param createdBy O ID do usuário que criou o comentário
   * @returns Array de IDs de usuários que devem ser notificados
   */
  getCommentCreatedNotificationRecipients(
    comment: Comment,
    createdBy: number,
  ): number[] {
    // Apenas usuários diretamente atribuídos à tarefa, excluindo o autor do comentário
    const userIds =
      comment.task?.users
        ?.map((user) => user.id)
        .filter((id) => id !== createdBy) || [];
    return userIds;
  }

  /**
   * Determina quais usuários devem receber notificações para um evento de mudança de status de tarefa
   * @param task A tarefa atualizada
   * @param updatedBy O ID do usuário que atualizou a tarefa
   * @param newStatus O novo status da tarefa
   * @returns Array de IDs de usuários que devem ser notificados
   */
  getTaskStatusUpdatedNotificationRecipients(
    task: Task,
    updatedBy: number,
    newStatus: string,
  ): number[] {
    // Se movido para revisão, notificar apenas o revisor (se diferente do autor)
    if (newStatus === 'em_revisao') {
      const reviewerId = task.reviewer?.id ?? task.task_reviewer_id ?? null;
      if (reviewerId && reviewerId !== updatedBy) {
        return [reviewerId];
      }
      return [];
    }

    // Comportamento padrão: notificar usuários atribuídos à tarefa (excluindo quem fez a mudança)
    const userIds =
      task.users?.map((user) => user.id).filter((id) => id !== updatedBy) || [];
    return userIds;
  }

  /**
   * Determina quais usuários devem receber notificações para um evento de atualização de tarefa
   * @param task A tarefa atualizada
   * @param updatedBy O ID do usuário que atualizou a tarefa
   * @returns Array de IDs de usuários que devem ser notificados
   */
  getTaskUpdatedNotificationRecipients(
    task: Task,
    updatedBy: number,
  ): number[] {
    // Apenas usuários diretamente atribuídos à tarefa, excluindo quem fez a atualização
    const userIds =
      task.users?.map((user) => user.id).filter((id) => id !== updatedBy) || [];
    return userIds;
  }
}
