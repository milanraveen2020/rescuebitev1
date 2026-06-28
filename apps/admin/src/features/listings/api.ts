import {
  AdminListingPageSchema,
  AdminListingSchema,
  BulkResultSchema,
  type AdminListing,
  type BulkResult,
  type SortOrder,
} from '@rescuebite/types';
import { apiRequest, jsonInit, queryString } from '@/lib/request';
import type { Page } from '@/components/usePagedData';

export interface ListingQuery {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
  search?: string;
  status?: string;
}

export async function listListings(query: ListingQuery): Promise<Page<AdminListing>> {
  return AdminListingPageSchema.parse(
    await apiRequest(`/admin/listings${queryString({ ...query })}`),
  );
}

export async function unpublishListing(id: string): Promise<AdminListing> {
  return AdminListingSchema.parse(
    await apiRequest(`/admin/listings/${id}/unpublish`, { method: 'POST' }),
  );
}

export async function bulkUnpublishListings(ids: string[]): Promise<BulkResult> {
  return BulkResultSchema.parse(
    await apiRequest('/admin/listings/bulk-unpublish', jsonInit('POST', { ids })),
  );
}
