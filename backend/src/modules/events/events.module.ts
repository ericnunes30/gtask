import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import { NotificationModule } from '../notification/notification.module';
import { TaskModule } from '../tasks/task.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [NotificationModule, forwardRef(() => TaskModule), UserModule],
  providers: [EventsGateway],
})
export class EventsModule {}
