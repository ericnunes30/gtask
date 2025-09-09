import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import { NotificationModule } from '../notification/notification.module';
import { TaskModule } from '../tasks/task.module';

@Module({
  imports: [NotificationModule, forwardRef(() => TaskModule)],
  providers: [EventsGateway],
})
export class EventsModule {}
