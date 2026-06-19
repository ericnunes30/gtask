import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  JoinColumn
} from 'typeorm';
import { PriorityLevel, Status } from './enums';

import { User } from '../../user/entities/user.entity';
import { Project } from '../../project/entities/project.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { RecurringTask } from '../../recurring-task/entities/recurring-task.entity';
import { ActivityLog } from '../../activity-log/entities/activity-log.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, type: 'integer' })
  order: number | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PriorityLevel,
  })
  priority: PriorityLevel;

  @Column({
    type: 'enum',
    enum: Status,
  })
  status: Status;

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  due_date: Date | null;

  @Column({ type: 'integer', default: 0 })
  timer: number;

  @Column({ name: 'project_id', type: 'integer' })
  project_id: number;

  @Column({ name: 'recurring_task_id', nullable: true, type: 'integer' })
  recurring_task_id: number | null;

  @Column({ name: 'task_reviewer_id', nullable: true, type: 'integer' })
  task_reviewer_id: number | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  video_url: string | null;

  @Column({ 
    type: 'jsonb', 
    nullable: true 
  })
  useful_links: Array<{ title: string; url: string }> | null;

  @Column({ nullable: true, type: 'text' })
  observations: string | null;

  @Column({ default: false, type: 'boolean' })
  has_detailed_fields: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Project, { eager: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => RecurringTask)
  @JoinColumn({ name: 'recurring_task_id' })
  recurringTask: RecurringTask;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'task_reviewer_id' })
  reviewer: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'task_user',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  users: User[];

  @ManyToMany(() => Occupation, occupation => occupation.tasks)
  occupations: Occupation[];

  @OneToMany(() => Comment, comment => comment.task)
  comments: Comment[];

  @OneToMany(() => ActivityLog, activityLog => activityLog.task)
  activityLogs: ActivityLog[];

  // Método de serialização personalizado para garantir que o campo timer seja incluído
  toJSON() {
    return {
      ...this,
      timer: this.timer || 0,
    };
  }
}
