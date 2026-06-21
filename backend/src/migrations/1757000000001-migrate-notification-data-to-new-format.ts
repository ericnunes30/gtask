import { MigrationInterface, QueryRunner } from 'typeorm';
import { NotificationType } from '../modules/notification/interfaces/notification.types';

// ---- Helpers para acessar dados legados (formato pre-migracao) ----

type LegacyObject = Record<string, unknown>;

/** Faz narrowing seguro para objeto. Retorna {} se nao for objeto. */
function asObject(value: unknown): LegacyObject {
  return typeof value === 'object' && value !== null
    ? (value as LegacyObject)
    : {};
}

/** Le string de um campo opcional de um objeto legacy. */
function readString(obj: LegacyObject, key: string, fallback: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v : fallback;
}

/**
 * Converte valor arbitrario em string. Objetos viram JSON,
 * valores primitivos usam String(). Nunca produz '[object Object]'.
 */
function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

export class MigrateNotificationDataToNewFormat1757000000001
  implements MigrationInterface
{
  name = 'MigrateNotificationDataToNewFormat1757000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Obter todas as notificações existentes
    const notifications = (await queryRunner.query(
      `SELECT id, type, data FROM structured_notifications`,
    )) as Array<{ id: number; type: string; data: unknown }>;

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

  private convertDataFormat(type: string, oldData: unknown): unknown {
    try {
      // Verificar se os dados já estão no novo formato
      if (this.isNewFormat(oldData)) {
        return oldData; // Já está no novo formato, não precisa converter
      }

      // Converter com base no tipo de notificação
      switch (type as NotificationType) {
        case NotificationType.TASK_CREATED:
          return this.convertTaskCreatedData(oldData);
        case NotificationType.TASK_STATUS_CHANGED:
          return this.convertTaskStatusUpdatedData(oldData);
        case NotificationType.COMMENT_CREATED:
          return this.convertCommentCreatedData(oldData);
        case NotificationType.TASK_UPDATED:
          return this.convertTaskUpdatedData(oldData);
        default:
          // Para outros tipos, manter o formato antigo
          return this.convertGenericData(oldData);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        `Erro ao converter dados da notificação do tipo ${type}:`,
        msg,
      );
      // Em caso de erro, manter os dados originais para evitar perda de informação
      return oldData;
    }
  }

  private isNewFormat(data: unknown): boolean {
    const obj = asObject(data);
    const hasActorAndTitle =
      typeof obj.actorName === 'string' && typeof obj.taskTitle === 'string';
    const hasChangedFields = Array.isArray(obj.changedFields);
    const hasEntityType =
      obj.entityType !== undefined && obj.entityId !== undefined;
    return (
      (hasActorAndTitle || (hasActorAndTitle && hasChangedFields)) &&
      !hasEntityType
    );
  }

  private convertTaskCreatedData(oldData: unknown): unknown {
    const root = asObject(oldData);
    const context = asObject(root.context);
    const performer = asObject(context.performer);
    const changes = asObject(root.changes);
    const taskChange = asObject(changes.task);
    const newValue = asObject(taskChange.newValue);

    const performerName = readString(performer, 'name', 'Usuário desconhecido');
    const taskTitle = readString(newValue, 'title', 'Tarefa desconhecida');
    const projectTitle = this.findEntityName(
      asObject(root.relatedEntities),
      'project',
    );

    return {
      actorName: performerName,
      taskTitle,
      projectTitle,
    };
  }

  private convertTaskStatusUpdatedData(oldData: unknown): unknown {
    const root = asObject(oldData);
    const context = asObject(root.context);
    const performer = asObject(context.performer);
    const changes = asObject(root.changes);
    const statusChange = asObject(changes.status);

    const performerName = readString(performer, 'name', 'Usuário desconhecido');
    const taskTitle =
      this.findEntityName(asObject(root.relatedEntities), 'task') ||
      'Tarefa desconhecida';
    const oldStatus = readString(statusChange, 'oldValue', 'Desconhecido');
    const newStatus = readString(statusChange, 'newValue', 'Desconhecido');

    return {
      actorName: performerName,
      taskTitle,
      oldStatus,
      newStatus,
    };
  }

  private convertCommentCreatedData(oldData: unknown): unknown {
    const root = asObject(oldData);
    const context = asObject(root.context);
    const performer = asObject(context.performer);
    const changes = asObject(root.changes);
    const commentChange = asObject(changes.comment);
    const newValue = asObject(commentChange.newValue);

    const performerName = readString(performer, 'name', 'Usuário desconhecido');
    const taskTitle =
      this.findEntityName(asObject(root.relatedEntities), 'task') ||
      'Tarefa desconhecida';
    const commentContent = readString(newValue, 'content', '');
    const commentSnippet =
      commentContent.length > 50
        ? commentContent.substring(0, 47) + '...'
        : commentContent;

    return {
      actorName: performerName,
      taskTitle,
      commentSnippet,
    };
  }

  private convertTaskUpdatedData(oldData: unknown): unknown {
    const root = asObject(oldData);
    const context = asObject(root.context);
    const performer = asObject(context.performer);

    const performerName = readString(performer, 'name', 'Usuário desconhecido');
    const taskTitle =
      this.findEntityName(asObject(root.relatedEntities), 'task') ||
      'Tarefa desconhecida';

    const changedFields: Array<{
      field: string;
      oldValue: string;
      newValue: string;
    }> = [];

    const changes = root.changes;
    if (changes && typeof changes === 'object') {
      for (const [field, changeValue] of Object.entries(changes)) {
        const cv = asObject(changeValue);
        changedFields.push({
          field,
          oldValue: stringifyValue(cv.oldValue),
          newValue: stringifyValue(cv.newValue),
        });
      }
    }

    return {
      actorName: performerName,
      taskTitle,
      changedFields,
    };
  }

  private convertGenericData(oldData: unknown): unknown {
    // Para tipos de notificação não especificamente tratados, manter o formato antigo
    return oldData;
  }

  /**
   * Encontra o nome de uma entidade em uma lista (relatedEntities) pelo tipo.
   * Retorna undefined se nao encontrar.
   */
  private findEntityName(
    relatedEntities: unknown,
    type: string,
  ): string | undefined {
    if (!Array.isArray(relatedEntities)) return undefined;
    for (const raw of relatedEntities) {
      const e = asObject(raw);
      if (e.type === type && typeof e.name === 'string') {
        return e.name;
      }
    }
    return undefined;
  }
}
