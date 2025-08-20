import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToMany
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';

@Entity('occupations')
export class Occupation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => User, user => user.occupations)
  users: User[];

  @ManyToMany(() => Project, project => project.occupations)
  projects: Project[];

  @ManyToMany(() => Task, task => task.occupations)
  tasks: Task[];
}