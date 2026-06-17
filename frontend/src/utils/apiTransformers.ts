// frontend/src/utils/apiTransformers.ts

import { Task, Project, Comment, Notification, ActivityLog } from '@/utils/commonTypes';

export const transformApiActivityLogToFrontend = (apiActivityLog: any): ActivityLog => {
  const transformedActivityLog: any = { ...apiActivityLog };

  if (apiActivityLog.task_id !== undefined) {
    transformedActivityLog.taskId = apiActivityLog.task_id;
    delete transformedActivityLog.task_id;
  }
  if (apiActivityLog.user_id !== undefined) {
    transformedActivityLog.userId = apiActivityLog.user_id;
    delete transformedActivityLog.user_id;
  }
  if (apiActivityLog.action_type !== undefined) {
    transformedActivityLog.actionType = apiActivityLog.action_type;
    delete transformedActivityLog.action_type;
  }
  if (apiActivityLog.changed_field !== undefined) {
    transformedActivityLog.changedField = apiActivityLog.changed_field;
    delete transformedActivityLog.changed_field;
  }
  if (apiActivityLog.old_value !== undefined) {
    transformedActivityLog.oldValue = apiActivityLog.old_value;
    delete transformedActivityLog.old_value;
  }
  if (apiActivityLog.new_value !== undefined) {
    transformedActivityLog.newValue = apiActivityLog.new_value;
    delete transformedActivityLog.new_value;
  }
  if (apiActivityLog.reference_id !== undefined) {
    transformedActivityLog.referenceId = apiActivityLog.reference_id;
    delete transformedActivityLog.reference_id;
  }
  if (apiActivityLog.created_at !== undefined) {
    transformedActivityLog.createdAt = apiActivityLog.created_at;
    delete transformedActivityLog.created_at;
  }

  return transformedActivityLog;
}

/**
 * Transforma um objeto de tarefa vindo da API para o formato esperado pelo frontend.
 * Converte campos como 'startDate', 'dueDate', 'projectId' para 'start_date', 'due_date', 'project_id'.
 * Mantém outros campos inalterados.
 * @param apiTask A tarefa recebida da API.
 * @returns A tarefa transformada para o formato do frontend.
 */
export const transformApiTaskToFrontend = (apiTask: any): Task => {
  const transformedTask: any = { ...apiTask };

  if (apiTask.startDate !== undefined) {
    transformedTask.start_date = apiTask.startDate;
    delete transformedTask.startDate;
  }
  if (apiTask.dueDate !== undefined) {
    transformedTask.due_date = apiTask.dueDate;
    delete transformedTask.dueDate;
  }
  if (apiTask.projectId !== undefined) {
    transformedTask.project_id = apiTask.projectId;
    delete transformedTask.projectId;
  }
  if (apiTask.taskReviewerId !== undefined) {
    transformedTask.task_reviewer_id = apiTask.taskReviewerId;
    delete transformedTask.taskReviewerId;
  }
  if (apiTask.videoUrl !== undefined) {
    transformedTask.video_url = apiTask.videoUrl;
    delete transformedTask.videoUrl;
  }
  if (apiTask.usefulLinks !== undefined) {
    transformedTask.useful_links = apiTask.usefulLinks;
    delete transformedTask.usefulLinks;
  }
  if (apiTask.hasDetailedFields !== undefined) {
    transformedTask.has_detailed_fields = apiTask.hasDetailedFields;
    delete transformedTask.hasDetailedFields;
  }

  // Se a tarefa tiver um objeto de projeto aninhado, transforme-o também se necessário
  if (apiTask.project) {
    transformedTask.project = transformApiProjectToFrontend(apiTask.project);
  }

  // Mantém 'users' como array de objetos User ou define como vazio se for null
  if (apiTask.users && Array.isArray(apiTask.users)) {
    transformedTask.users = apiTask.users; // Manter os objetos User completos
  } else if (apiTask.users === null) {
    transformedTask.users = [];
  }

  // Mantém 'occupations' como array de objetos Occupation ou define como vazio se for null
  if (apiTask.occupations && Array.isArray(apiTask.occupations)) {
    transformedTask.occupations = apiTask.occupations; // Manter os objetos Occupation completos
  } else if (apiTask.occupations === null) {
    transformedTask.occupations = [];
  }

  if (apiTask.activityLogs && Array.isArray(apiTask.activityLogs)) {
    transformedTask.activityLogs = apiTask.activityLogs.map(transformApiActivityLogToFrontend);
  }

  // Transformar comentários se existirem
  if (apiTask.comments && Array.isArray(apiTask.comments)) {
    console.log('🔄 TRANSFORMER: Transformando comentários:', apiTask.comments);
    transformedTask.comments = apiTask.comments.map((comment: any) => transformApiCommentToFrontend(comment));
    console.log('✅ TRANSFORMER: Comentários transformados:', transformedTask.comments);
  }

  return transformedTask;
};

/**
 * Transforma um objeto de projeto vindo da API para o formato esperado pelo frontend.
 * Converte campos como 'startDate', 'endDate' para 'start_date', 'end_date'.
 * Mantém outros campos inalterados.
 * @param apiProject O projeto recebido da API.
 * @returns O projeto transformado para o formato do frontend.
 */
export const transformApiCommentToFrontend = (apiComment: any): Comment => {
  console.log('💬 COMMENT TRANSFORMER: Entrada:', apiComment);
  const transformedComment: any = { ...apiComment };

  if (apiComment.created_at !== undefined) {
    transformedComment.createdAt = apiComment.created_at;
    delete transformedComment.created_at;
  }
  if (apiComment.updated_at !== undefined) {
    transformedComment.updatedAt = apiComment.updated_at;
    delete transformedComment.updated_at;
  }
  if (apiComment.user_id !== undefined) {
    transformedComment.user_id = apiComment.user_id;
    delete transformedComment.user_id;
  }
  if (apiComment.parent_id !== undefined) {
    transformedComment.parentId = apiComment.parent_id;
    delete transformedComment.parent_id;
  }
  if (apiComment.likes_count !== undefined) {
    console.log('🎯 Converting likes_count:', apiComment.likes_count, '→', parseInt(apiComment.likes_count, 10) || 0);
    transformedComment.likesCount = parseInt(apiComment.likes_count, 10) || 0;
    delete transformedComment.likes_count;
  }

  // Transformar likes se existirem
  if (apiComment.likes && Array.isArray(apiComment.likes)) {
    transformedComment.likes = apiComment.likes.map((like: any) => {
      const transformedLike: any = { ...like };
      
      // Converter created_at para createdAt se necessário
      if (like.created_at !== undefined) {
        transformedLike.createdAt = like.created_at;
        delete transformedLike.created_at;
      }
      
      return transformedLike;
    });
  }

  // Recursivamente transformar replies se existirem
  if (apiComment.replies && Array.isArray(apiComment.replies)) {
    transformedComment.replies = apiComment.replies.map((reply: any) => transformApiCommentToFrontend(reply));
  }

  return transformedComment;
};

export const transformApiProjectToFrontend = (apiProject: any): Project => {
  const transformedProject: Project = { ...apiProject };

  if (apiProject.startDate !== undefined) {
    transformedProject.start_date = apiProject.startDate;
    delete transformedProject.startDate;
  }
  if (apiProject.endDate !== undefined) {
    transformedProject.end_date = apiProject.endDate;
    delete transformedProject.endDate;
  }

  // Transforma tarefas aninhadas, se houver
  if (apiProject.tasks && Array.isArray(apiProject.tasks)) {
    transformedProject.tasks = apiProject.tasks.map((task: any) => transformApiTaskToFrontend(task));
  }

  return transformedProject;
};

/**
 * Transforma uma notificação do backend (StructuredNotification) para o formato esperado pelo frontend.
 * @param backendNotification A notificação recebida do backend.
 * @returns A notificação transformada para o formato do frontend.
 */
export const transformBackendNotificationToFrontend = (backendNotification: any): Notification => {
  // Verificar se é uma notificação no novo formato (com data e metadata)
  if (backendNotification.data && backendNotification.metadata) {
    const { id, userId, isRead, createdAt } = backendNotification;
    const { data, type } = backendNotification;
    
    // Gerar mensagem com base no tipo de notificação
    let message = '';
    let link = '';
    
    switch (type) {
      case 'task.created':
        message = `${data.actorName} criou a tarefa "${data.taskTitle}"` + 
                  (data.projectTitle ? ` no projeto "${data.projectTitle}"` : '');
        // Para simplificar, vamos usar um link genérico para tarefas
        link = '/tasks';
        break;
        
      case 'task.status.changed':
        message = `${data.actorName} alterou o status da tarefa "${data.taskTitle}" de "${data.oldStatus}" para "${data.newStatus}"`;
        link = '/tasks';
        break;
        
      case 'comment.created':
        message = `${data.actorName} comentou na tarefa "${data.taskTitle}": "${data.commentSnippet}"`;
        link = '/tasks';
        break;
        
      case 'task.updated':
        const fieldNames: Record<string, string> = {
          'title': 'título',
          'description': 'descrição',
          'priority': 'prioridade',
          'status': 'status'
        };
        
        if (data.changedFields && data.changedFields.length > 0) {
          const firstField = data.changedFields[0];
          const fieldName = fieldNames[firstField.field] || firstField.field;
          message = `${data.actorName} atualizou o(a) ${fieldName} da tarefa "${data.taskTitle}"`;
        } else {
          message = `${data.actorName} atualizou a tarefa "${data.taskTitle}"`;
        }
        link = '/tasks';
        break;
        
      case 'timer.started':
      case 'timer.paused':
        // Para notificações de timer, vamos usar o formato antigo por enquanto
        message = data.changes?.timer?.newValue?.status === 'running' 
          ? `Timer iniciado para a tarefa`
          : `Timer pausado para a tarefa`;
        link = '/tasks';
        break;
        
      default:
        // Para tipos desconhecidos ou formato antigo
        message = 'Você tem uma nova notificação';
        link = '/';
        break;
    }
    
    return {
      id,
      userId,
      message,
      link,
      isRead,
      createdAt: createdAt.toString() // Converter para string se necessário
    };
  }
  
  // Se não for uma notificação no novo formato, retornar como está
  // (pode ser uma notificação já no formato do frontend ou em formato antigo)
  return backendNotification;
};