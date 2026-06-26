import { NotFoundException } from '@nestjs/common';

export class ProjectNotFoundException extends NotFoundException {
  constructor(id: number) {
    super({
      message: `Project with ID ${id} not found`,
      code: 'PROJECT_NOT_FOUND',
    });
  }
}
