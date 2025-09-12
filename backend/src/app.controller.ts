import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Endpoint de teste para Sentry: lança um erro 500
  @Get('sentry-test')
  sentryTest(): string {
    throw new Error('Sentry test error from /sentry-test');
  }
}
