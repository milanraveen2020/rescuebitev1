import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/** Global so auth and notifications share one branded email sender. */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
