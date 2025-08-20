import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  ManyToOne,
  JoinColumn,
  Unique
} from 'typeorm';
import { Comment } from './comment.entity';
import { User } from '../../user/entities/user.entity';

@Entity('comment_likes')
@Unique(['comment_id', 'user_id'])
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'comment_id' })
  comment_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}