import { Module, Global } from '@nestjs/common';
import { PermissionService } from './services/permission.service';

@Global()
@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}