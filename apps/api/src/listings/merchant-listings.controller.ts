import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Listing } from '@rescuebite/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateListingDto, ListingDto, UpdateListingDto } from './listings.dto';
import { ListingsService } from './listings.service';

/** Merchant-owner CRUD for their own store's listings. */
@ApiTags('merchant-listings')
@ApiBearerAuth()
@Roles('MERCHANT_OWNER')
@Controller('merchant/listings')
export class MerchantListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Post()
  @ApiOkResponse({ schema: ListingDto.openApiSchema })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateListingDto): Promise<Listing> {
    return this.listings.create(user.id, dto);
  }

  @Get()
  listOwn(@CurrentUser() user: AuthenticatedUser): Promise<Listing[]> {
    return this.listings.listOwn(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ schema: ListingDto.openApiSchema })
  getOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Listing> {
    return this.listings.getOwn(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ schema: ListingDto.openApiSchema })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ): Promise<Listing> {
    return this.listings.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.listings.remove(user.id, id);
  }
}
