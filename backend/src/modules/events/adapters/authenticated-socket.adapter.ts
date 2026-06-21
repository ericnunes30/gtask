import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { Server, Socket, ServerOptions } from 'socket.io';
import { AuthService } from '../../auth/services/auth.service';

// Adicionamos uma propriedade 'user' ao tipo do Socket do socket.io
declare module 'socket.io' {
  interface Socket {
    user?: Express.User;
  }
}

export class AuthenticatedSocketAdapter extends IoAdapter {
  private readonly authService: AuthService;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
    // Obtemos a instância do AuthService a partir do contexto da aplicação
    this.authService = this.app.get<AuthService, AuthService>(AuthService);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    // Usamos um middleware do socket.io para autenticação
    server.use((socket: Socket, next) => {
      const auth = socket.handshake.auth as { token?: unknown };
      const rawToken: unknown = auth.token;
      const token = typeof rawToken === 'string' ? rawToken : '';
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const userPayload = this.authService.verifyToken(token);
        // Anexamos o payload do usuário ao objeto do socket para uso posterior
        socket.user = userPayload;
        next();
      } catch {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    return server;
  }
}
