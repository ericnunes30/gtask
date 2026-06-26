import { NotFoundException } from '@nestjs/common';

export class CommentNotFoundException extends NotFoundException {
  constructor(id: number) {
    super({
      message: `Comment with ID ${id} not found`,
      code: 'COMMENT_NOT_FOUND',
    });
  }
}
