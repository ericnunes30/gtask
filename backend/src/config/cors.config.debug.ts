import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsConfig: CorsOptions = {
  // Versão mais permissiva para debug
  origin: true, // Permite todas as origens temporariamente
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token',
    'X-API-KEY',
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
