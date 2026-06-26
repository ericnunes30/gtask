import { NotFoundException } from '@nestjs/common';

export class TaskNotFoundException extends NotFoundException {
  constructor(id: number) {
    super({
      message: `Task with ID ${id} not found`,
      code: 'TASK_NOT_FOUND',
    });
  }
}
