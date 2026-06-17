import { useCallback, useEffect, useState } from 'react';
import { useBackendServices } from '@/hooks/useBackendServices';
import { Comment, Task, User } from '@/utils/commonTypes';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/adapters/AuthContextAdapter';

export function useTaskComments(task: Task | null, refetchTaskDetails?: () => void) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<number[]>([]);

  const { user: authUser } = useAuth();
  const { comments: commentsService, users: usersService } = useBackendServices();
  const { mutateAsync: createComment, isLoading: isSubmittingComment } = commentsService.useCreateComment();
  const { data: allUsers = [] } = usersService.useGetUsers();

  useEffect(() => {
    console.log('💬 USE TASK COMMENTS: Task recebida:', task);
    console.log('💬 USE TASK COMMENTS: Task.comments recebidos:', task?.comments);
    if (task?.comments) {
      const sortedComments = task.comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log('💬 USE TASK COMMENTS: Comentários ordenados:', sortedComments);
      setComments(sortedComments);
    }
  }, [task?.comments]);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);

    const lastAtSymbolIndex = value.lastIndexOf('@');
    if (lastAtSymbolIndex !== -1 && lastAtSymbolIndex > value.lastIndexOf(' ')) {
      const query = value.substring(lastAtSymbolIndex + 1).toLowerCase();
      setMentionQuery(query);
      setShowMentionsList(true);
    } else {
      setShowMentionsList(false);
    }
  }, []);

  const handleAddComment = useCallback(async () => {
    if (!comment.trim() || !task || !authUser) return;

    const commentData = {
      content: comment,
      task_id: task.id,
    };

    const promise = createComment(commentData);

    toast.promise(promise, {
      loading: 'Adicionando comentário...',
      success: () => {
        setComment('');
        setMentionedUsers([]);
        refetchTaskDetails?.();
        return 'Comentário adicionado!';
      },
      error: 'Erro ao adicionar comentário.',
    });
  }, [comment, task, authUser, mentionedUsers, createComment, refetchTaskDetails]);

  const handleMentionUser = useCallback((user: User) => {
    const lastAtSymbolIndex = comment.lastIndexOf('@');
    const newComment = comment.substring(0, lastAtSymbolIndex) + `@${user.name} `;
    setComment(newComment);
    setShowMentionsList(false);

    if (!mentionedUsers.includes(user.id)) {
      setMentionedUsers([...mentionedUsers, user.id]);
    }
  }, [comment, mentionedUsers]);

  const getFilteredUsers = useCallback((query: string) => {
    if (!query) return allUsers;
    const q = query.toLowerCase();
    return allUsers.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [allUsers]);

  return {
    comments,
    comment,
    handleCommentChange,
    handleAddComment,
    isSubmittingComment,
    users: allUsers,
    mentionQuery,
    showMentionsList,
    handleMentionUser,
    getFilteredUsers,
  };
}