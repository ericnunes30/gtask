import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import {
  NotificationType,
  NotificationPriority
} from '../interfaces/notification.types';
import type {
  NotificationData,
  NotificationMetadata,
  StructuredNotification
} from '../interfaces/notification.types';

@Entity('structured_notifications')
@Index(['userId', 'createdAt']) // Índice para performance
@Index(['type']) // Índice para consultas por tipo
@Index(['priority']) // Índice para consultas por prioridade
export class StructuredNotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationPriority })
  priority: NotificationPriority;

  @Column({ type: 'jsonb' })
  data: NotificationData;

  @Column({ type: 'jsonb' })
  metadata: NotificationMetadata;

  @ManyToOne(() => User, user => user.structuredNotifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ name: 'expires_at', nullable: true, type: 'timestamp with time zone' })
  expiresAt?: Date;

  @Column({ name: 'delivered_at', nullable: true, type: 'timestamp with time zone' })
  deliveredAt?: Date;

  @Column({ name: 'read_at', nullable: true, type: 'timestamp with time zone' })
  readAt?: Date;

  // Método para converter de entidade para domain object
  toDomain(): StructuredNotification {
    // Validar dados antes de retornar
    if (!this.data || typeof this.data !== 'object') {
      throw new Error(`Invalid notification data for notification ${this.id}`);
    }

    if (!this.metadata || typeof this.metadata !== 'object') {
      throw new Error(`Invalid notification metadata for notification ${this.id}`);
    }

    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      priority: this.priority,
      data: this.data,
      metadata: this.metadata,
      isRead: this.isRead,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      deliveredAt: this.deliveredAt,
      readAt: this.readAt,
    };
  }

  // Método estático para criar entidade a partir de domain object
  static fromDomain(domain: StructuredNotification): StructuredNotificationEntity {
    const entity = new StructuredNotificationEntity();
    // Evita forçar inserção com id=0 (deixe o banco gerar o ID)
    if (typeof domain.id === 'number' && domain.id > 0) {
      entity.id = domain.id;
    }
    entity.userId = domain.userId;
    entity.type = domain.type;
    entity.priority = domain.priority;
    entity.data = domain.data;
    entity.metadata = domain.metadata;
    entity.isRead = domain.isRead;
    entity.createdAt = domain.createdAt;
    entity.expiresAt = domain.expiresAt;
    entity.deliveredAt = domain.deliveredAt;
    entity.readAt = domain.readAt;
    return entity;
  }
}
