import { Injectable } from '@nestjs/common';

/**
 * Subconjunto de `User` usado pelas estrategias de payload de token.
 * Permite tipar `user.roles` sem depender da entity completa.
 */
export interface UserWithRoles {
  id: number;
  email: string;
  name: string;
  roles?: { name: string }[];
}

export interface TokenPayloadStrategy {
  canHandle(user: UserWithRoles, context?: string): boolean;
  createPayload(user: UserWithRoles): Record<string, unknown>;
}

@Injectable()
export class DefaultTokenPayloadStrategy implements TokenPayloadStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  createPayload(user: UserWithRoles): Record<string, unknown> {
    return {
      email: user.email,
      sub: user.id,
      name: user.name,
    };
  }
}

@Injectable()
export class ExtendedTokenPayloadStrategy implements TokenPayloadStrategy {
  canHandle(user: UserWithRoles, context?: string): boolean {
    return context === 'extended';
  }

  createPayload(user: UserWithRoles): Record<string, unknown> {
    return {
      email: user.email,
      sub: user.id,
      name: user.name,
      roles: user.roles?.map((role) => role.name) ?? [],
    };
  }
}

@Injectable()
export class TokenPayloadFactory {
  private readonly strategies: TokenPayloadStrategy[];

  constructor() {
    this.strategies = [
      new ExtendedTokenPayloadStrategy(),
      new DefaultTokenPayloadStrategy(), // fallback
    ];
  }

  createPayload(
    user: UserWithRoles,
    context?: string,
  ): Record<string, unknown> {
    const strategy = this.strategies.find((s) => s.canHandle(user, context));

    if (!strategy) {
      throw new Error(`No token payload strategy found for user: ${user.id}`);
    }

    return strategy.createPayload(user);
  }
}
