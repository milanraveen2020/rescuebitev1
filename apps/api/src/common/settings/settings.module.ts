import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';

/** Global so both checkout (payments) and the admin console share one source. */
@Global()
@Module({
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
