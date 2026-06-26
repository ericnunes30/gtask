import { NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor(id: number) {
    super({
      message: `User with ID ${id} not found`,
      code: 'USER_NOT_FOUND',
    });
  }
}
