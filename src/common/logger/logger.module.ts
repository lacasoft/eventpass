import { Module, Global } from '@nestjs/common';
import { SecurityAuditService } from './security-audit.service';

@Global()
@Module({
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class LoggerModule {}
