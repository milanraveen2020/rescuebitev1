import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingLifecycleService } from './listing-lifecycle.service';
import { MerchantListingsController } from './merchant-listings.controller';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [ListingsController, MerchantListingsController, UploadController],
  providers: [ListingsService, UploadService, ListingLifecycleService],
  exports: [ListingsService],
})
export class ListingsModule {}
