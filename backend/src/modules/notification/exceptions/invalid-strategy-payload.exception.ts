import { UnprocessableEntityException } from '@nestjs/common';

export class InvalidStrategyPayloadException extends UnprocessableEntityException {
  constructor(eventType: string) {
    super({
      message: `Invalid payload for event type: ${eventType}`,
      code: 'INVALID_STRATEGY_PAYLOAD',
    });
  }
}
