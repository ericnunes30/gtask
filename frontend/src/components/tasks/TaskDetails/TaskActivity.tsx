import React from 'react';
import { ActivityLog, Comment as ApiComment, Task, User } from '@/utils/commonTypes';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { History, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/contexts/adapters/AuthContextAdapter';
import CommentItem from '@/components/comments/CommentItem';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskActivityProps {
  task: Task;
  comments: ApiComment[];
  history: ActivityLog[];
  activityTab: 'all' | 'comments' | 'history';
  setActivityTab: (tab: 'all' | 'comments' | 'history') => void;
  comment: string;
  onCommentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onAddComment: () => void | Promise<void>;
  isSubmittingComment: boolean;
  users: User[];
  mentionQuery: string;
  showMentionsList: boolean;
  onMentionUser: (user: User) => void;
  getFilteredUsers: () => User[];
  onReplySuccessfullyAdded: () => void;
}

const TaskActivity: React.FC<TaskActivityProps> = ({
  task,
  comments,
  history,
  activityTab,
  setActivityTab,
  comment,
  onCommentChange,
  onAddComment,
  isSubmittingComment,
  users,
  showMentionsList,
  onMentionUser,
  getFilteredUsers,
  onReplySuccessfullyAdded,
}) => {
  const { user: authUser } = useAuth();

  const safeFormatDateTime = (value: any): string => {
    try {
      if (!value) return 'Data inválida';
      
      let d = new Date(value);

      if (!isValid(d)) {
        d = parseISO(value);
      }

      if (!isValid(d)) return 'Data inválida';
      
      return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatHistoryMessage = (item: ActivityLog, allUsers: User[]) => {
    const userName = item.user?.name || 'Sistema';
    const actionType = item.actionType || '';
    const pretty = (s?: string) => (s || '').replace(/_/g, ' ');
    const safeFormatDate = (value: any): string => {
      try {
        if (!value) return 'não definida';
        
        let d = new Date(value);

        if (!isValid(d)) {
          // If new Date() fails, try parseISO for good measure, as it handles pure ISO strings better
          d = parseISO(value);
        }

        if (!isValid(d)) return 'não definida';
        
        return format(d, 'dd/MM/yyyy', { locale: ptBR });
      } catch {
        return 'não definida';
      }
    };

    const actionTypeTranslations: { [key: string]: string } = {
      'TASK_DUE_DATE_UPDATED': 'Data de vencimento da tarefa atualizada',
      'TASK_START_DATE_UPDATED': 'Data de início da tarefa atualizada',
      'TASK_PRIORITY_UPDATED': 'Prioridade da tarefa atualizada',
      'TASK_HAS_DETAILED_FIELDS_UPDATED': 'Campos detalhados da tarefa atualizados',
      'TASK_USEFUL_LINKS_UPDATED': 'Links úteis da tarefa atualizados',
      'TASK_VIDEO_URL_UPDATED': 'URL do vídeo da tarefa atualizada',
      'TASK_DESCRIPTION_UPDATED': 'Descrição da tarefa atualizada',
      'TASK_ASSIGNEES_UPDATED': 'Responsáveis pela tarefa atualizados',
      'TASK_CREATED': 'Tarefa criada',
    };

    const translatedAction = actionTypeTranslations[actionType];
    if (translatedAction) {
        return <span>{translatedAction} por <strong>{userName}</strong>.</span>;
    }

    switch (actionType) {
      case 'CREATE_TASK':
        return <span>Tarefa criada por <strong>{userName}</strong>.</span>;
      case 'TASK_UPDATED':
        if (item.changedField === 'start_date' || item.changedField === 'due_date') {
          const oldDate = safeFormatDate(item.oldValue);
          const newDate = safeFormatDate(item.newValue);
          const fieldName = item.changedField === 'start_date' ? 'data de início' : 'data de vencimento';
          return <span><strong>{userName}</strong> alterou a {fieldName} de <strong>{oldDate}</strong> para <strong>{newDate}</strong>.</span>;
        }
        if (item.changedField === 'description') {
          const stripHtml = (html: string) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || '';
          };
          const oldDesc = item.oldValue ? stripHtml(item.oldValue) : 'vazia';
          const newDesc = item.newValue ? stripHtml(item.newValue) : 'vazia';
          return <span><strong>{userName}</strong> alterou a descrição de "{oldDesc}" para "{newDesc}".</span>;
        }
        if (item.changedField === 'has_detailed_fields') {
          const action = item.newValue === 'true' ? 'ativou' : 'desativou';
          return <span><strong>{userName}</strong> {action} os campos detalhados.</span>;
        }
        if (item.changedField === 'useful_links') {
          return <span><strong>{userName}</strong> atualizou os links úteis.</span>;
        }
        if (item.changedField) {
          if (item.changedField === 'status') {
            return (
              <span>
                <strong>{userName}</strong> alterou o status de <strong>{pretty(item.oldValue)}</strong> para <strong>{pretty(item.newValue)}</strong>.
              </span>
            );
          }
          return (
            <span>
              <strong>{userName}</strong> atualizou o campo <strong>{pretty(item.changedField)}</strong> de <strong>{pretty(item.oldValue)}</strong> para <strong>{pretty(item.newValue)}</strong>.
            </span>
          );
        }
        return <span><strong>{userName}</strong> atualizou a tarefa.</span>;
      case 'TASK_DELETED':
        return <span><strong>{userName}</strong> excluiu esta tarefa.</span>;
      case 'TASK_STATUS_UPDATED':
        return (
          <span>
            <strong>{userName}</strong> alterou o status de <strong>{pretty(item.oldValue)}</strong> para <strong>{pretty(item.newValue)}</strong>.
          </span>
        );
      case 'TASK_ASSIGNEES_SET':
        try {
          const userIds = JSON.parse(item.newValue || '[]');
          if (Array.isArray(userIds) && userIds.length > 0) {
            const assignedUsers = allUsers
              .filter(user => userIds.includes(user.id))
              .map(user => user.name)
              .join(', ');
            return <span><strong>{userName}</strong> atribuiu a tarefa para: <strong>{assignedUsers}</strong>.</span>;
          }
        } catch (e) {
          // ignore
        }
        return <span><strong>{userName}</strong> definiu os responsáveis pela tarefa.</span>;
      case 'TASK_ASSIGNEES_REMOVED':
        return <span><strong>{userName}</strong> removeu responsáveis da tarefa.</span>;
      case 'CREATE_COMMENT':
        return <span><strong>{userName}</strong> adicionou um comentário.</span>;
      default:
        return <span>{actionType.replace(/_/g, ' ')} por <strong>{userName}</strong>.</span>;
    }
  };

  const getActivityItems = () => {
    let items: (ApiComment | ActivityLog)[] = [];
    if (activityTab === 'all' || activityTab === 'comments') {
      items.push(...comments);
    }
    if (activityTab === 'all' || activityTab === 'history') {
      items.push(...history);
    }

    return items.sort((a, b) => {
      const dateAStr = (a as any).created_at || (a as any).createdAt;
      const dateBStr = (b as any).created_at || (b as any).createdAt;

      const dateA = dateAStr ? parseISO(dateAStr) : new Date(0);
      const dateB = dateBStr ? parseISO(dateBStr) : new Date(0);

      if (!isValid(dateA) && !isValid(dateB)) {
        return 0;
      }
      if (!isValid(dateA)) {
        return 1;
      }
      if (!isValid(dateB)) {
        return -1;
      }

      return dateB.getTime() - dateA.getTime();
    });
  };

  return (
    <div className="w-1/2 flex flex-col h-full bg-background">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="text-lg font-medium">Atividade</div>
          <div className="flex gap-1">
            <Button
              variant={activityTab === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setActivityTab('all')}
            >
              Todos
            </Button>
            <Button
              variant={activityTab === 'comments' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setActivityTab('comments')}
            >
              Comentários
            </Button>
            <Button
              variant={activityTab === 'history' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setActivityTab('history')}
            >
              <History className="h-4 w-4 mr-1" />
              Histórico
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {getActivityItems().length > 0 ? (
            getActivityItems().map(item => {
              const isComment = 'content' in item as any;
              const dateString = ((item as any).created_at || (item as any).createdAt) as string | undefined;
              const formattedDate = safeFormatDateTime(dateString);

              return (
                <div key={`${isComment ? 'comment' : 'history'}-${(item as any).id}`}>
                  {isComment ? (
                    <CommentItem comment={item as ApiComment} parentTaskId={task.id} onReplySuccessfullyAdded={onReplySuccessfullyAdded} />
                  ) : (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary/80 text-secondary-foreground">
                          <History className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-muted-foreground text-sm break-words">
                              {formatHistoryMessage(item as ActivityLog, users)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma atividade registrada ainda.</p>
              <p className="text-sm">Seja o primeiro a comentar!</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {authUser?.name ? authUser.name.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              value={comment}
              onChange={onCommentChange}
              placeholder="Escreva um comentário... Use @ para mencionar alguém"
              className="min-h-[80px] pr-12"
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
              onClick={onAddComment}
              disabled={!comment.trim() || isSubmittingComment}
            >
              <Send className="h-4 w-4" />
            </Button>

            {showMentionsList && (
              <div className="absolute bottom-full mb-1 w-full bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto z-10">
                {getFilteredUsers().length > 0 ? (
                  getFilteredUsers().map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                      onClick={() => onMentionUser(user)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">Nenhum usuário encontrado</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskActivity;
