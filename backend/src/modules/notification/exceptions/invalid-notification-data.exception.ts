import { BadRequestException } from '@nestjs/common';

export class InvalidNotificationDataException extends BadRequestException {
  constructor() {
    super({
      message: 'Invalid notification data',
      code: 'INVALID_NOTIFICATION_DATA',
    });
  }
}
