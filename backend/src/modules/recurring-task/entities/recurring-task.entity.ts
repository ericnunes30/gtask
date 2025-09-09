import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { PriorityLevel } from '../../tasks/entities/enums';

export enum ScheduleType {
  INTERVAL = 'interval',
  CRON = 'cron',
}

export interface TaskTemplate {
  title: string;
  description?: string;
  priority: PriorityLevel;
  assignee_ids: number[];
  occupation_ids: number[];
  task_reviewer_id: number;
  start_date?: string;
  due_date?: string;
}

@Entity('recurring_tasks')
export class RecurringTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'jsonb', name: 'template_data' })
  templateData: TaskTemplate;

  @Column({ type: 'timestamp', name: 'next_due_date' })
  next_due_date: Date;

  @Column({ default: true, type: 'boolean', name: 'is_active' })
  is_active: boolean;

  @Column({
    type: 'enum',
    enum: ScheduleType,
    name: 'schedule_type'
  })
  schedule_type: ScheduleType;

  @Column({ nullable: true, type: 'varchar', name: 'frequency_interval' })
  frequency_interval: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'frequency_cron' })
  frequency_cron: string | null;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @Column({ name: 'project_id', type: 'integer' })
  projectId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => Task, task => task.recurringTask)
  tasks: Task[];
}