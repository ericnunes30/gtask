import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommentCreator } from '../services/comment-creator.abstract';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { Comment } from '../entities/comment.entity';

@Injectable()
export class CommentCreationDecorator extends CommentCreator {
  private readonly logger = new Logger(CommentCreationDecorator.name);

  constructor(
    @Inject(CommentService) private readonly commentCreator: CommentCreator,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async create(createCommentDto: CreateCommentDto, userId: number): Promise<Comment> {
    this.logger.log(`Decorator: Iniciando criação de comentário para user #${userId}`);
    this.logger.log(`Decorator: CommentCreator type: ${this.commentCreator.constructor.name}`);
    this.logger.log(`Decorator: EventEmitter2 disponível: ${!!this.eventEmitter}`);
    this.logger.log(`Decorator: Dados recebidos: ${JSON.stringify(createCommentDto)}`);
    
    try {
      this.logger.log(`Decorator: Chamando CommentService.create original...`);
      const comment = await this.commentCreator.create(createCommentDto, userId);
      this.logger.log(`Decorator: Comentário #${comment.id} criado com sucesso.`);
      this.logger.log(`Decorator: Preparando para emitir evento 'comment.created'...`);
      
      const eventData = { comment, createdBy: userId };
      this.logger.log(`Decorator: Dados do evento: ${JSON.stringify(eventData)}`);
      
      this.eventEmitter.emit('comment.created', eventData);
      this.logger.log(`Decorator: Evento 'comment.created' emitido com sucesso.`);
      
      return comment;
    } catch (error) {
      this.logger.error(`Decorator: Erro durante criação do comentário ou emissão do evento.`, error.stack);
      throw error;
    }
  }
}