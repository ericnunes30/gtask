import { Module, Global } from '@nestjs/common';
import { NotificationRecipientService } from './services/notification-recipient.service';
import { NOTIFICATION_RECIPIENT_RESOLVER } from '../notification/interfaces/notification-recipient-resolver.token';

@Global()
@Module({
  providers: [
    NotificationRecipientService,
    {
      provide: NOTIFICATION_RECIPIENT_RESOLVER,
      useExisting: NotificationRecipientService,
    },
  ],
  exports: [NotificationRecipientService, NOTIFICATION_RECIPIENT_RESOLVER],
})
export class PermissionModule {}
