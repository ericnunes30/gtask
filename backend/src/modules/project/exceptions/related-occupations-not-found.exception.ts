import { BadRequestException } from '@nestjs/common';

export class RelatedOccupationsNotFoundException extends BadRequestException {
  constructor(missingIds: number[]) {
    super({
      message: `Related occupations not found: ${missingIds.join(', ')}`,
      code: 'PROJECT_RELATED_OCCUPATIONS_NOT_FOUND',
      details: { missingIds },
    });
  }
}
