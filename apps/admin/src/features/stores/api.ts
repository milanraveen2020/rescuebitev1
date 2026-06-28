import {
  AdminStorePageSchema,
  AdminStoreSchema,
  BulkResultSchema,
  type AdminStore,
  type BulkResult,
  type SortOrder,
} from '@rescuebite/types';
import { apiRequest, jsonInit, queryString } from '@/lib/request';
import type { Page } from '@/components/usePagedData';

export interface StoreQuery {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
  search?: string;
  status?: string;
}

export async function listStores(query: StoreQuery): Promise<Page<AdminStore>> {
  return AdminStorePageSchema.parse(await apiRequest(`/admin/stores${queryString({ ...query })}`));
}

export async function approveStore(id: string): Promise<AdminStore> {
  return AdminStoreSchema.parse(
    await apiRequest(`/admin/stores/${id}/approve`, { method: 'POST' }),
  );
}

export async function rejectStore(id: string, reason: string): Promise<AdminStore> {
  return AdminStoreSchema.parse(
    await apiRequest(`/admin/stores/${id}/reject`, jsonInit('POST', { reason })),
  );
}

export async function bulkApproveStores(ids: string[]): Promise<BulkResult> {
  return BulkResultSchema.parse(
    await apiRequest('/admin/stores/bulk-approve', jsonInit('POST', { ids })),
  );
}
