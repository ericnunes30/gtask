import { ConflictException } from '@nestjs/common';

export class DuplicateOccupationNameException extends ConflictException {
  constructor(name: string) {
    super({
      message: `Occupation with name "${name}" already exists`,
      code: 'DUPLICATE_OCCUPATION_NAME',
    });
  }
}
