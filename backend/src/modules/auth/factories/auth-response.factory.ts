import { Injectable } from '@nestjs/common';

/**
 * Subconjunto de User usado pelas estrategias de resposta de autenticacao.
 * Aceita tanto a entity User completa quanto payloads parciais.
 */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  roles?: { name: string }[] | string[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    roles?: { name: string }[] | string[];
  };
  expires_in?: number;
}

export interface AuthResponseStrategy {
  canHandle(context?: string): boolean;
  createResponse(accessToken: string, user: AuthUser): AuthResponse;
}

@Injectable()
export class LoginResponseStrategy implements AuthResponseStrategy {
  canHandle(context?: string): boolean {
    return context === 'login' || !context; // default for login
  }

  createResponse(accessToken: string, user: AuthUser): AuthResponse {
    return {
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }
}

@Injectable()
export class DetailedLoginResponseStrategy implements AuthResponseStrategy {
  canHandle(context?: string): boolean {
    return context === 'detailed';
  }

  createResponse(accessToken: string, user: AuthUser): AuthResponse {
    return {
      access_token: accessToken,
      refresh_token: null,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
      },
      expires_in: 86400, // 24 hours
    };
  }
}

@Injectable()
export class AuthResponseFactory {
  private readonly strategies: AuthResponseStrategy[];

  constructor() {
    this.strategies = [
      new DetailedLoginResponseStrategy(),
      new LoginResponseStrategy(), // fallback
    ];
  }

  createLoginResponse(
    accessToken: string,
    user: AuthUser,
    context?: string,
  ): AuthResponse {
    const strategy = this.strategies.find((s) => s.canHandle(context));

    if (!strategy) {
      throw new Error(
        `No auth response strategy found for context: ${context}`,
      );
    }

    return strategy.createResponse(accessToken, user);
  }
}
