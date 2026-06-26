import { NotFoundException } from '@nestjs/common';

export class NotificationNotFoundException extends NotFoundException {
  constructor(id: number) {
    super({
      message: `Notification with ID ${id} not found`,
      code: 'NOTIFICATION_NOT_FOUND',
    });
  }
}
