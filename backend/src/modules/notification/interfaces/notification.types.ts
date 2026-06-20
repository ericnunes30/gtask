export enum NotificationType {
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_STATUS_CHANGED = 'task.status.changed',
  TASK_ASSIGNED = 'task.assigned',
  COMMENT_CREATED = 'comment.created',
  TIMER_STARTED = 'timer.started',
  TIMER_PAUSED = 'timer.paused',
  TIMER_COMPLETED = 'timer.completed',
  USER_MENTIONED = 'user.mentioned',
  PROJECT_UPDATED = 'project.updated',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationCategory {
  TASK = 'task',
  COMMENT = 'comment',
  TIMER = 'timer',
  SYSTEM = 'system',
  USER = 'user',
  PROJECT = 'project',
}

export interface ChangeValue {
  oldValue: any;
  newValue: any;
  timestamp?: string;
  changedBy?: string;
}

export interface RelatedEntity {
  type: string;
  id: number;
  name?: string;
  metadata?: Record<string, any>;
  avatar?: string;
}

export interface Performer {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
}

export interface NotificationContext {
  performer?: Performer;
  timestamp: string;
  source: string;
  additionalData?: Record<string, any>;
}

// Interfaces para dados específicos de cada tipo de notificação
export interface TaskCreatedData {
  actorName: string;
  taskTitle: string;
  projectTitle?: string;
}

export interface TaskStatusUpdatedData {
  actorName: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
}

export interface CommentCreatedData {
  actorName: string;
  taskTitle: string;
  commentSnippet: string;
}

export interface TaskUpdatedData {
  actorName: string;
  taskTitle: string;
  changedFields: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

// Tipo para o campo data que pode ser a estrutura antiga ou as novas estruturas
export type NotificationData =
  | {
      entityType: string;
      entityId: number;
      changes?: Record<string, ChangeValue>;
      relatedEntities?: RelatedEntity[];
      action: string;
      context?: NotificationContext;
    }
  | TaskCreatedData
  | TaskStatusUpdatedData
  | CommentCreatedData
  | TaskUpdatedData;

export interface NotificationMetadata {
  source: string;
  category: NotificationCategory;
  tags: string[];
  version: string;
  correlationId?: string;
  parentNotificationId?: number;
}

export interface StructuredNotification {
  id: number;
  userId: number;
  type: NotificationType;
  priority: NotificationPriority;
  data: NotificationData;
  metadata: NotificationMetadata;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface NotificationQueryOptions {
  unreadOnly?: boolean;
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  categories?: NotificationCategory[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationPagination {
  items: StructuredNotification[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Payloads para eventos específicos
export interface TaskCreatedPayload {
  task: {
    id: number;
    title: string;
    status: string;
    priority: string;
    project?: {
      id: number;
      title: string;
    };
  };
  createdBy: number;
  performer?: Performer;
}

export interface TaskStatusUpdatedPayload {
  task: {
    id: number;
    title: string;
    project?: {
      id: number;
      title: string;
    };
  };
  oldStatus: string;
  newStatus: string;
  updatedBy: number;
  performer?: Performer;
}

export interface CommentCreatedPayload {
  comment: {
    id: number;
    content: string;
    task: {
      id: number;
      title: string;
    };
  };
  createdBy: number;
  performer?: Performer;
}

export interface TimerEventPayload {
  task: {
    id: number;
    title: string;
    project?: {
      id: number;
      title: string;
    };
  };
  userId: number;
  performer?: Performer;
  duration?: number;
}

// Interface para estratégias
export interface NotificationStrategy {
  type: NotificationType;
  create(payload: Record<string, unknown>): StructuredNotification;
  validate(payload: Record<string, unknown>): boolean;
  getPriority(payload: Record<string, unknown>): NotificationPriority;
}

// Interfaces para migração
export interface MigrationOptions {
  batchSize?: number;
  dryRun?: boolean;
  validateOnly?: boolean;
  userIds?: number[];
}

export interface MigrationResult {
  totalNotifications: number;
  processed: number;
  success: number;
  failed: number;
  errors: MigrationError[];
  duration: number;
  successRate: number;
}

export interface MigrationError {
  notificationId: number;
  error: string;
  details: Record<string, any>;
}

export interface BatchResult {
  processed: number;
  success: number;
  failed: number;
  errors: MigrationError[];
}

// Interfaces para monitoramento
export interface NotificationMetrics {
  notificationsCreated: number;
  websocketMessagesSent: number;
  averageProcessingTime: number;
  errors: number;
  lastProcessingTime?: number;
}

export interface MigrationStats {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  startTime?: Date;
  endTime?: Date;
  currentBatch: number;
  totalBatches: number;
}
