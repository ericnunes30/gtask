import { CreateDateColumn, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('task_locks')
export class TaskLock {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  lockKey: string;

  @Column({ type: 'varchar', length: 255 })
  instanceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
