import { Injectable } from '@nestjs/common';

export interface AuthResponseStrategy {
  canHandle(context?: string): boolean;
  createResponse(accessToken: string, user: any): any;
}

@Injectable()
export class LoginResponseStrategy implements AuthResponseStrategy {
  canHandle(context?: string): boolean {
    return context === 'login' || !context; // default for login
  }

  createResponse(accessToken: string, user: any): any {
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

  createResponse(accessToken: string, user: any): any {
    return {
      access_token: accessToken,
      refresh_token: null, // Could be implemented later
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || [],
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

  createLoginResponse(accessToken: string, user: any, context?: string): any {
    const strategy = this.strategies.find(s => s.canHandle(context));
    
    if (!strategy) {
      throw new Error(`No auth response strategy found for context: ${context}`);
    }
    
    return strategy.createResponse(accessToken, user);
  }
}