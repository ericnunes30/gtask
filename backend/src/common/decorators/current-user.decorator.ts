// Param decorator que extrai `req.user` (populado pelo JwtAuthGuard) com tipagem forte.
//
// Substitui o padrao `@Request() req: ExpressRequest` + `req.user.sub` por
// `@CurrentUser() user` + `user.sub`.
//
// Pressupoe que o metodo esteja protegido por um guard que popule `req.user`
// (ex.: @UseGuards(JwtAuthGuard)). Sem o guard, `user` sera `undefined` em runtime
// e o acesso a `user.sub` resultara em erro.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Express.User => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as Express.User;
  },
);
