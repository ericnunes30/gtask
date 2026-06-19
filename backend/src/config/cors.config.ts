import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests from these origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:3000', // React default port
      'http://localhost:5173', // Vite default port
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081',
      'http://192.168.1.116:8080', // Dev environment
      'http://172.17.176.1:8080',
      /^http:\/\/172\.\d+\.\d+\.\d+:8080/, // Docker internal network
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is allowed (supports both strings and regex)
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (
      process.env.NODE_ENV === 'development' &&
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token',
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
