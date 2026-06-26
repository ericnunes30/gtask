import { NotFoundException } from '@nestjs/common';

export class RoleNotFoundException extends NotFoundException {
  constructor(id: number, message?: string) {
    super({
      message: message ?? `Role with ID ${id} not found`,
      code: 'ROLE_NOT_FOUND',
    });
  }
}
