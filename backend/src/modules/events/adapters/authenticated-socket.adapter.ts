import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/services/auth.service';

// Adicionamos uma propriedade 'user' ao tipo do Socket do socket.io
declare module 'socket.io' {
  interface Socket {
    user?: any; // Você pode criar uma interface User mais robusta
  }
}

export class AuthenticatedSocketAdapter extends IoAdapter {
  private readonly authService: AuthService;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
    // Obtemos a instância do AuthService a partir do contexto da aplicação
    this.authService = this.app.get(AuthService);
  }

  createIOServer(port: number, options?: any): any {
    const server: Server = super.createIOServer(port, options);

    // Usamos um middleware do socket.io para autenticação
    server.use(async (socket: Socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const userPayload = await this.authService.verifyToken(token);
        // Anexamos o payload do usuário ao objeto do socket para uso posterior
        socket.user = userPayload;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    return server;
  }
}
