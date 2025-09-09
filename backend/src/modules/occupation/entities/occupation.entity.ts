import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';

@Entity('occupations')
export class Occupation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => User, user => user.occupations)
  @JoinTable({
    name: 'users_occupations',
    joinColumn: { name: 'occupation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  users: User[];

  @ManyToMany(() => Project, project => project.occupations)
  @JoinTable({
    name: 'occupations_projects',
    joinColumn: { name: 'occupation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'project_id', referencedColumnName: 'id' }
  })
  projects: Project[];

  @ManyToMany(() => Task, task => task.occupations)
  @JoinTable({
    name: 'occupations_tasks',
    joinColumn: { name: 'occupation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'task_id', referencedColumnName: 'id' }
  })
  tasks: Task[];
}