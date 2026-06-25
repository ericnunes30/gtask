import { Module, Provider } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { GlobalValidationPipe } from './pipes/validation.pipe';

const exceptionProviders: Provider[] = [
  {
    provide: APP_FILTER,
    useClass: AllExceptionsFilter,
  },
  {
    provide: APP_PIPE,
    useClass: GlobalValidationPipe,
  },
];

@Module({
  providers: exceptionProviders,
  exports: exceptionProviders,
})
export class ExceptionModule {}
