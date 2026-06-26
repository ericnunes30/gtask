import { NotFoundException } from '@nestjs/common';

export class UserNotInOccupationException extends NotFoundException {
  constructor(userId: number, occupationId: number) {
    super({
      message: `User with ID ${userId} not found in occupation ${occupationId}`,
      code: 'USER_NOT_IN_OCCUPATION',
    });
  }
}
