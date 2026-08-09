import { Global, Module } from '@nestjs/common';
import { PublicConfigController } from './public-config.controller';
import { SettingsService } from './settings.service';

/** Global so both checkout (payments) and the admin console share one source. */
@Global()
@Module({
  controllers: [PublicConfigController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
