import {
  AdminReviewPageSchema,
  AdminReviewSchema,
  type AdminReview,
  type SortOrder,
} from '@rescuebite/types';
import { apiRequest, apiRequestVoid, jsonInit, queryString } from '@/lib/request';
import type { Page } from '@/components/usePagedData';

export interface ReviewQuery {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
  search?: string;
  hidden?: string;
}

export async function listReviews(query: ReviewQuery): Promise<Page<AdminReview>> {
  return AdminReviewPageSchema.parse(
    await apiRequest(`/admin/reviews${queryString({ ...query })}`),
  );
}

export async function hideReview(id: string, reason?: string): Promise<AdminReview> {
  return AdminReviewSchema.parse(
    await apiRequest(`/admin/reviews/${id}/hide`, jsonInit('POST', { reason })),
  );
}

export async function unhideReview(id: string): Promise<AdminReview> {
  return AdminReviewSchema.parse(
    await apiRequest(`/admin/reviews/${id}/unhide`, { method: 'POST' }),
  );
}

export async function removeReview(id: string): Promise<void> {
  await apiRequestVoid(`/admin/reviews/${id}`, { method: 'DELETE' });
}
