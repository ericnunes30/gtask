import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';

type ActivityLogDetails = {
  [key: string]: any;
};

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', nullable: true, type: 'integer' })
  userId!: number | null;

  @Column({ name: 'task_id', nullable: true, type: 'integer' })
  taskId!: number | null;

  @Column({ name: 'action_type', type: 'varchar' })
  actionType!: string;

  @Column({ name: 'changed_field', nullable: true, type: 'varchar' })
  changedField!: string | null;

  @Column({ name: 'old_value', nullable: true, type: 'text' })
  oldValue!: string | null;

  @Column({ name: 'new_value', nullable: true, type: 'text' })
  newValue!: string | null;

  @Column({ name: 'reference_id', nullable: true, type: 'integer' })
  referenceId!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: ActivityLogDetails | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}
