import { Injectable } from '@nestjs/common';
import { User } from '../../user/entities/user.entity';

export interface TokenPayloadStrategy {
  canHandle(user: any, context?: string): boolean;
  createPayload(user: any): any;
}

@Injectable()
export class DefaultTokenPayloadStrategy implements TokenPayloadStrategy {
  canHandle(): boolean {
    return true; // fallback strategy
  }

  createPayload(user: any): any {
    return {
      email: user.email,
      sub: user.id,
      name: user.name,
    };
  }
}

@Injectable()
export class ExtendedTokenPayloadStrategy implements TokenPayloadStrategy {
  canHandle(user: any, context?: string): boolean {
    return context === 'extended';
  }

  createPayload(user: any): any {
    return {
      email: user.email,
      sub: user.id,
      name: user.name,
      roles: user.roles?.map(role => role.name) || [],
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

  createPayload(user: any, context?: string): any {
    const strategy = this.strategies.find(s => s.canHandle(user, context));
    
    if (!strategy) {
      throw new Error(`No token payload strategy found for user: ${user.id}`);
    }
    
    return strategy.createPayload(user);
  }
}