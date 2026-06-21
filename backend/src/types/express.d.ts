// Estende o tipo Request do express para incluir a propriedade `user`
// populada pelo JwtAuthGuard (passport-jwt). Isso permite usar `req.user`
// com tipagem forte em todos os controllers.
import 'express';

declare global {
  namespace Express {
    interface User {
      sub: number;
      email: string;
      name: string;
      username?: string;
      roles?: string[];
    }
  }
}
