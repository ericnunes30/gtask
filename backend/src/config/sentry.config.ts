import * as Sentry from '@sentry/node';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // Not configured; noop
    return;
  }

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    // Error monitoring only — disable performance/profiling
    tracesSampleRate: 0,
    profilesSampleRate: 0,
  });
}

