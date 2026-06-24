import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './gateways/events.gateway';
import { NotificationEventListener } from './listeners/notification-event.listener';
import { StartupVerificationService } from './services/startup-verification/startup-verification.service';
import { NotificationModule } from '../notification/notification.module';
import { TaskModule } from '../tasks/task.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [NotificationModule, forwardRef(() => TaskModule), UserModule],
  providers: [
    EventsGateway,
    NotificationEventListener,
    StartupVerificationService,
  ],
})
export class EventsModule {}
