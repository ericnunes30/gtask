import { ConflictException } from '@nestjs/common';

export class DuplicateRoleNameException extends ConflictException {
  constructor(name: string) {
    super({
      message: `Role with name "${name}" already exists`,
      code: 'DUPLICATE_ROLE_NAME',
    });
  }
}
