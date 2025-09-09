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

// Importações dos relacionamentos (serão descomentadas quando as outras entidades estiverem criadas)
// import { Role } from '../../role/db/role.entity';
// import { Occupation } from '../../occupation/db/occupation.entity';
// import { Project } from '../../project/db/project.entity';
// import { Task } from '../../tasks/db/task.entity';
// import { Comment } from '../../comment/db/comment.entity';
// import { RecurringTask } from '../../recurring-task/db/recurring-task.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Equivalente ao serializeAs: null
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos (comentados até criar as outras entidades)
  /*
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

  @ManyToMany(() => Task, task => task.users)
  tasks: Task[];

  @OneToMany(() => RecurringTask, recurringTask => recurringTask.user)
  recurringTasks: RecurringTask[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];
  */
}
