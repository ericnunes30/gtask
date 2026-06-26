import { NotFoundException } from '@nestjs/common';

export class OccupationNotFoundException extends NotFoundException {
  constructor(id: number, message?: string) {
    super({
      message: message ?? `Occupation with ID ${id} not found`,
      code: 'OCCUPATION_NOT_FOUND',
    });
  }
}
