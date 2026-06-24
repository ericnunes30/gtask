/**
 * Token de injeção para o resolvedor de destinatários de notificações.
 *
 * Usado com @Inject(NOTIFICATION_RECIPIENT_RESOLVER) para desacoplar
 * consumidores da implementação concreta.
 */
export const NOTIFICATION_RECIPIENT_RESOLVER = Symbol(
  'NOTIFICATION_RECIPIENT_RESOLVER',
);
