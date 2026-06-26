import { BadRequestException } from '@nestjs/common';

export class StrategyNotFoundException extends BadRequestException {
  constructor(eventType: string) {
    super({
      message: `No strategy found for event type: ${eventType}`,
      code: 'STRATEGY_NOT_FOUND',
    });
  }
}
