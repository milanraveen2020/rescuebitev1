import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { PublicConfig } from '@rescuebite/types';
import { Public } from '../../auth/decorators/public.decorator';
import { PublicConfigDto } from './public-config.dto';
import { SettingsService } from './settings.service';

/**
 * Unauthenticated read of the operator configuration clients need at startup.
 *
 * The customer app and the merchant listing form previously hardcoded the full
 * `FoodCategory` enum, so `enabledCategories` — an admin-editable setting — had no
 * observable effect anywhere. This endpoint is the single place clients ask.
 */
@ApiTags('config')
@Public()
@Controller('config')
export class PublicConfigController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOkResponse({ type: PublicConfigDto })
  async get(): Promise<PublicConfig> {
    const { enabledCategories } = await this.settings.getSettings();
    return { enabledCategories };
  }
}
