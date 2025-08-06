import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, History } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Comment as ApiComment, User as ApiUser } from '@/common/types';
import { useAuth } from '@/contexts/AuthContext';
import CommentItem from '@/components/comments/CommentItem';
import { TaskHistoryItem } from '@/types/modal';

export type ActivityItem = (ApiComment | TaskHistoryItem) & { 
  type?: 'comment' | 'history' 
};

interface TaskCommentsProps {
  taskId: number;
  comments?: ApiComment[];
  history?: TaskHistoryItem[];
  users?: ApiUser[];
  onAddComment: (content: string) => Promise<void>;
  onRefetch: () => void;
  isSubmitting?: boolean;
}

type ActivityTab = 'all' | 'comments' | 'history';

export const TaskComments: React.FC<TaskCommentsProps> = ({
  taskId,
  comments = [],
  history = [],
  users = [],
  onAddComment,
  onRefetch,
  isSubmitting = false
}) => {
  const { user: authUser } = useAuth();
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [comment, setComment] = useState('');
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Processar mudanças no comentário e detectar menções
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);

    // Detectar menção (@)
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionsList(true);
    } else {
      setShowMentionsList(false);
      setMentionQuery('');
    }
  };

  // Filtrar usuários para menções
  const getFilteredUsers = () => {
    if (!mentionQuery) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  };

  // Adicionar menção de usuário
  const handleMentionUser = (user: ApiUser) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = comment.substring(0, cursorPosition);
    const textAfterCursor = comment.substring(cursorPosition);
    
    // Encontrar o início da menção
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const mentionStart = cursorPosition - mentionMatch[0].length;
      const newText = comment.substring(0, mentionStart) + `@${user.name} ` + textAfterCursor;
      setComment(newText);
      setShowMentionsList(false);
      setMentionQuery('');
      
      // Focar de volta no textarea
      setTimeout(() => {
        const newCursorPosition = mentionStart + `@${user.name} `.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  };

  // Adicionar comentário
  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      await onAddComment(comment);
      setComment('');
      setShowMentionsList(false);
      setMentionQuery('');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    }
  };

  // Formatar mensagem do histórico
  const formatHistoryMessage = (item: TaskHistoryItem) => {
    switch (item.action) {
      case 'created':
        return 'criou a tarefa';
      case 'updated':
        if (item.field) {
          const fieldNames: Record<string, string> = {
            title: 'título',
            description: 'descrição',
            status: 'status',
            priority: 'prioridade',
            due_date: 'data de vencimento',
            timer: 'tempo'
          };
          const fieldName = fieldNames[item.field] || item.field;
          return `atualizou ${fieldName}`;
        }
        return 'atualizou a tarefa';
      case 'assigned':
        return 'foi atribuído à tarefa';
      case 'unassigned':
        return 'foi removido da tarefa';
      default:
        return item.action;
    }
  };

  // Obter itens de atividade filtrados
  const getActivityItems = (): ActivityItem[] => {
    let items: ActivityItem[] = [];

    if (activityTab === 'all' || activityTab === 'comments') {
      items = [...items, ...comments.map(c => ({ ...c, type: 'comment' as const }))];
    }

    if (activityTab === 'all' || activityTab === 'history') {
      items = [...items, ...history.map(h => ({ ...h, type: 'history' as const }))];
    }

    return items.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  };

  return (
    <div className="w-1/2 flex flex-col h-full">
      {/* Header com tabs */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="text-lg font-medium">Atividade</div>
          <div className="flex gap-1">
            <Button
              variant={activityTab === 'all' ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setActivityTab('all')}
            >
              Todos
            </Button>
            <Button
              variant={activityTab === 'comments' ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setActivityTab('comments')}
            >
              Comentários
            </Button>
            <Button
              variant={activityTab === 'history' ? "default" : "ghost"}
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

      {/* Lista de atividades (com scroll) */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {getActivityItems().length > 0 ? (
            getActivityItems().map(item => {
              const isComment = 'content' in item;
              const dateString = item.createdAt;
              let formattedDate = "Data inválida";
              if (dateString) {
                const date = parseISO(dateString);
                if (isValid(date)) {
                  formattedDate = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
                }
              }

              return (
                <div key={`${isComment ? 'comment' : 'history'}-${item.id}`}>
                  {isComment ? (
                    <CommentItem 
                      comment={item as ApiComment} 
                      parentTaskId={taskId} 
                      onReplySuccessfullyAdded={onRefetch} 
                    />
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
                            <span className="font-medium">{(item as TaskHistoryItem).user?.name || 'Sistema'}</span>
                            <span className="text-muted-foreground ml-2 text-sm">
                              {formatHistoryMessage(item as TaskHistoryItem)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formattedDate}</span>
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

      {/* Área de comentário (fixada na parte inferior) */}
      <div className="p-4 border-t">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {authUser ? (
                authUser.name && authUser.name.includes(' ') ?
                  authUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) :
                  (authUser.name ? authUser.name.substring(0, 2).toUpperCase() : 'U')
              ) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              value={comment}
              onChange={handleCommentChange}
              placeholder="Escreva um comentário... Use @ para mencionar alguém"
              className="min-h-[80px] pr-12"
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
              onClick={handleAddComment}
              disabled={!comment.trim() || isSubmitting}
            >
              <Send className="h-4 w-4" />
            </Button>

            {/* Lista de menções */}
            {showMentionsList && (
              <div className="absolute bottom-full mb-1 w-full bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto z-10">
                {getFilteredUsers().length > 0 ? (
                  getFilteredUsers().map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                      onClick={() => handleMentionUser(user)}
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