import { BadRequestException } from '@nestjs/common';

export class RelatedUsersNotFoundException extends BadRequestException {
  constructor(missingIds: number[]) {
    super({
      message: `Related users not found: ${missingIds.join(', ')}`,
      code: 'PROJECT_RELATED_USERS_NOT_FOUND',
      details: { missingIds },
    });
  }
}
