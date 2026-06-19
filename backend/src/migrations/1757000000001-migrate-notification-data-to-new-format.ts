import { MigrationInterface, QueryRunner } from 'typeorm';
import { NotificationType } from '../modules/notification/interfaces/notification.types';

export class MigrateNotificationDataToNewFormat1757000000001
  implements MigrationInterface
{
  name = 'MigrateNotificationDataToNewFormat1757000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Obter todas as notificações existentes
    const notifications = await queryRunner.query(
      `SELECT id, type, data FROM structured_notifications`,
    );

    // Processar cada notificação e converter o formato do campo data
    for (const notification of notifications) {
      const newData = this.convertDataFormat(
        notification.type,
        notification.data,
      );

      if (newData) {
        // Atualizar a notificação com o novo formato de dados
        await queryRunner.query(
          `UPDATE structured_notifications SET data = $1 WHERE id = $2`,
          [newData, notification.id],
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Reverter a migração não é trivial, pois perdemos informações na conversão
    // Para simplificar, vamos apenas registrar uma mensagem
    console.warn(
      'Revertendo migração: Não é possível restaurar o formato antigo dos dados de notificação.',
    );
  }

  private convertDataFormat(type: string, oldData: any): any {
    try {
      // Verificar se os dados já estão no novo formato
      if (this.isNewFormat(oldData)) {
        return oldData; // Já está no novo formato, não precisa converter
      }

      // Converter com base no tipo de notificação
      switch (type) {
        case NotificationType.TASK_CREATED:
          return this.convertTaskCreatedData(oldData);
        case NotificationType.TASK_STATUS_CHANGED:
          return this.convertTaskStatusUpdatedData(oldData);
        case NotificationType.COMMENT_CREATED:
          return this.convertCommentCreatedData(oldData);
        case NotificationType.TASK_UPDATED:
          return this.convertTaskUpdatedData(oldData);
        default:
          // Para outros tipos, manter o formato antigo ou converter de forma genérica
          return this.convertGenericData(oldData);
      }
    } catch (error) {
      console.error(
        `Erro ao converter dados da notificação do tipo ${type}:`,
        error,
      );
      // Em caso de erro, manter os dados originais para evitar perda de informação
      return oldData;
    }
  }

  private isNewFormat(data: any): boolean {
    // Verificar se o dado já tem uma das estruturas do novo formato
    return (
      ((data.actorName && data.taskTitle) || // TaskCreatedData ou TaskStatusUpdatedData ou CommentCreatedData
        (data.actorName && data.taskTitle && data.changedFields) || // TaskUpdatedData
        (data.entityType !== undefined && data.entityId !== undefined)) && // Formato antigo
      !(data.entityType !== undefined && data.entityId !== undefined)
    ); // Mas não o formato antigo
  }

  private convertTaskCreatedData(oldData: any): any {
    // Extrair informações do formato antigo
    const performerName =
      oldData.context?.performer?.name || 'Usuário desconhecido';
    const taskTitle =
      oldData.changes?.task?.newValue?.title || 'Tarefa desconhecida';
    const projectTitle = oldData.relatedEntities?.find(
      (e: any) => e.type === 'project',
    )?.name;

    // Criar novo formato
    return {
      actorName: performerName,
      taskTitle: taskTitle,
      projectTitle: projectTitle,
    };
  }

  private convertTaskStatusUpdatedData(oldData: any): any {
    // Extrair informações do formato antigo
    const performerName =
      oldData.context?.performer?.name || 'Usuário desconhecido';
    const taskTitle =
      oldData.relatedEntities?.find((e: any) => e.type === 'task')?.name ||
      'Tarefa desconhecida';
    const oldStatus = oldData.changes?.status?.oldValue || 'Desconhecido';
    const newStatus = oldData.changes?.status?.newValue || 'Desconhecido';

    // Criar novo formato
    return {
      actorName: performerName,
      taskTitle: taskTitle,
      oldStatus: oldStatus,
      newStatus: newStatus,
    };
  }

  private convertCommentCreatedData(oldData: any): any {
    // Extrair informações do formato antigo
    const performerName =
      oldData.context?.performer?.name || 'Usuário desconhecido';
    const taskTitle =
      oldData.relatedEntities?.find((e: any) => e.type === 'task')?.name ||
      'Tarefa desconhecida';
    const commentContent = oldData.changes?.comment?.newValue?.content || '';
    const commentSnippet =
      commentContent.length > 50
        ? commentContent.substring(0, 47) + '...'
        : commentContent;

    // Criar novo formato
    return {
      actorName: performerName,
      taskTitle: taskTitle,
      commentSnippet: commentSnippet,
    };
  }

  private convertTaskUpdatedData(oldData: any): any {
    // Extrair informações do formato antigo
    const performerName =
      oldData.context?.performer?.name || 'Usuário desconhecido';
    const taskTitle =
      oldData.relatedEntities?.find((e: any) => e.type === 'task')?.name ||
      'Tarefa desconhecida';

    // Converter changedFields
    const changedFields: Array<{
      field: string;
      oldValue: string;
      newValue: string;
    }> = [];
    if (oldData.changes) {
      for (const [field, changeValue] of Object.entries(oldData.changes)) {
        changedFields.push({
          field: field,
          oldValue: String((changeValue as any).oldValue || ''),
          newValue: String((changeValue as any).newValue || ''),
        });
      }
    }

    // Criar novo formato
    return {
      actorName: performerName,
      taskTitle: taskTitle,
      changedFields: changedFields,
    };
  }

  private convertGenericData(oldData: any): any {
    // Para tipos de notificação não especificamente tratados, manter o formato antigo
    // ou converter de forma genérica se possível
    return oldData;
  }
}
