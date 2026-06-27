import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { UploadTicket } from '@rescuebite/types';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadRequestDto, UploadTicketDto } from './listings.dto';
import { UploadService } from './upload.service';

/** Signed-upload tickets for listing images (merchant-only). */
@ApiTags('uploads')
@ApiBearerAuth()
@Roles('MERCHANT_OWNER')
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  @Post('listing-image')
  @ApiOkResponse({ schema: UploadTicketDto.openApiSchema })
  createListingImageTicket(@Body() dto: UploadRequestDto): Promise<UploadTicket> {
    return this.uploads.createListingImageTicket(dto);
  }
}
