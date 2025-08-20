import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { CommentLike } from './comment-like.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @Column({ name: 'task_id' })
  task_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parentComment: Comment;

  @OneToMany(() => Comment, comment => comment.parentComment)
  replies: Comment[];

  @OneToMany(() => CommentLike, commentLike => commentLike.comment)
  likes: CommentLike[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'comment_user_mentions',
    joinColumn: { name: 'comment_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  mentionedUsers: User[];

  get repliesCount(): number {
    return this.replies ? this.replies.length : 0;
  }
}