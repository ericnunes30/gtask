import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  ManyToOne,
  JoinColumn,
  Unique,
  AfterInsert,
  AfterRemove
} from 'typeorm';
import { Comment } from './comment.entity';
import { User } from '../../user/entities/user.entity';

@Entity('comment_likes')
@Unique(['commentId', 'userId'])
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'comment_id' })
  commentId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @AfterInsert()
  async incrementCommentLikes() {
    // Hook será implementado no service se necessário
    // Para evitar problemas de circular dependency
  }

  @AfterRemove()
  async decrementCommentLikes() {
    // Hook será implementado no service se necessário
    // Para evitar problemas de circular dependency
  }
}