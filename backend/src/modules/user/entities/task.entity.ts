import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum PriorityLevel {
  Low = 'baixa',
  Medium = 'media',
  High = 'alta',
  Urgent = 'urgente',
}

export enum Status {
  Backlog = 'pendente',
  ToDo = 'a_fazer',
  InProgress = 'em_andamento',
  Review = 'em_revisao',
  WaitingClient = 'aguardando_cliente',
  Done = 'concluido',
  Cancelled = 'cancelado',
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  order: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

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

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  due_date: Date;

  @Column()
  timer: number;

  @Column()
  project_id: number;

  @Column({ nullable: true })
  recurring_task_id: number;

  @Column({ nullable: true })
  task_reviewer_id: number;

  @Column({ nullable: true })
  video_url: string;

  @Column({ type: 'jsonb', nullable: true }) // Assuming JSONB for array of objects
  useful_links: Array<{ title: string; url: string }>;

  @Column({ nullable: true })
  observations: string;

  @Column()
  has_detailed_fields: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
