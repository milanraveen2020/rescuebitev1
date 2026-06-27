import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ListingDetail, NearbyListingPage } from '@rescuebite/types';
import { Public } from '../auth/decorators/public.decorator';
import { ListingDetailDto, NearbyListingPageDto, NearbyQueryDto } from './listings.dto';
import { ListingsService } from './listings.service';

/** Public, customer-facing listing discovery. */
@ApiTags('listings')
@Public()
@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  // Declared before ':id' so the static segment wins.
  @Get('nearby')
  @ApiOkResponse({ schema: NearbyListingPageDto.openApiSchema })
  findNearby(@Query() query: NearbyQueryDto): Promise<NearbyListingPage> {
    return this.listings.findNearby(query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: ListingDetailDto.openApiSchema })
  getDetail(@Param('id', ParseUUIDPipe) id: string): Promise<ListingDetail> {
    return this.listings.getPublicDetail(id);
  }
}
