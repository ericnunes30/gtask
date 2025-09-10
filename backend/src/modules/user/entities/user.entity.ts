import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Occupation } from '../../occupation/entities/occupation.entity';
import { Role } from '../../role/entities/role.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Project } from '../../project/entities/project.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { StructuredNotificationEntity } from '../../notification/entities/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToMany(() => Occupation, (occupation) => occupation.users)
  occupations: Occupation[];

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'users_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @ManyToMany(() => Task, (task) => task.users)
  tasks: Task[];

  @ManyToMany(() => Project, (project) => project.users)
  projects: Project[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => StructuredNotificationEntity, (notification) => notification.user)
  structuredNotifications: StructuredNotificationEntity[];
}
