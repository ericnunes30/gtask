import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../user/entities/user.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { PriorityLevel } from '../../tasks/entities/enums';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ type: 'boolean' })
  status: boolean;

  @Column({
    type: 'enum',
    enum: PriorityLevel,
  })
  priority: PriorityLevel;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'projects_users',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  users: User[];

  @ManyToMany(() => Occupation, occupation => occupation.projects)
  occupations: Occupation[];
}