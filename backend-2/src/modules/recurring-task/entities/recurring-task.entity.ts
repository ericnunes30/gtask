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
  assignee_ids?: number[];
  occupation_ids?: number[];
  start_date?: string;
  due_date?: string;
}

@Entity('recurring_tasks')
export class RecurringTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  templateData: TaskTemplate;

  @Column({ type: 'timestamp' })
  next_due_date: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column({
    type: 'enum',
    enum: ScheduleType,
  })
  schedule_type: ScheduleType;

  @Column({ nullable: true })
  frequency_interval: string | null;

  @Column({ nullable: true })
  frequency_cron: string | null;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
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