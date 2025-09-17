export interface WhatsAppConfig {
  apiKey: string;
  instance: string;
  baseUrl: string;
  delay: number;
  enabled: boolean;
}

export interface WhatsAppMessage {
  number: string;
  text: string;
  delay?: number;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface WhatsAppUserPreferences {
  whatsappNotificationsEnabled: boolean;
  whatsappPriorityThreshold: NotificationPriority;
  whatsappQuietHoursStart: string;
  whatsappQuietHoursEnd: string;
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationType {
  TASK_CREATED = 'task.created',
  TASK_STATUS_CHANGED = 'task.status.changed',
  COMMENT_CREATED = 'comment.created',
  TIMER_STARTED = 'timer.started',
  TIMER_PAUSED = 'timer.paused'
}

export interface MessageTemplate {
  type: NotificationType;
  template: string;
  priority: NotificationPriority;
}

export interface RateLimitInfo {
  userId: string;
  lastMessage: Date;
  messageCount: number;
}

export interface WhatsAppRateLimitConfig {
  maxMessagesPerMinute: number;
  maxRetries: number;
  retryDelay: number;
}