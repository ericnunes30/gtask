import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable
} from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { RecurringTask } from '../../recurring-task/entities/recurring-task.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'users_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
  })
  roles: Role[];

  @ManyToMany(() => Occupation)
  @JoinTable({
    name: 'users_occupations',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'occupation_id', referencedColumnName: 'id' }
  })
  occupations: Occupation[];

  @ManyToMany(() => Project)
  @JoinTable({
    name: 'projects_users',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'project_id', referencedColumnName: 'id' }
  })
  projects: Project[];

  @ManyToMany(() => Task)
  @JoinTable({
    name: 'task_user',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'task_id', referencedColumnName: 'id' }
  })
  tasks: Task[];

  @OneToMany(() => RecurringTask, recurringTask => recurringTask.user)
  recurringTasks: RecurringTask[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];
}