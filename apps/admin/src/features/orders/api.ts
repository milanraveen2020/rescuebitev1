import {
  AdminOrderPageSchema,
  OrderDetailSchema,
  type AdminOrder,
  type OrderDetail,
  type SortOrder,
} from '@rescuebite/types';
import { apiRequest, queryString } from '@/lib/request';
import type { Page } from '@/components/usePagedData';

export interface OrderQuery {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
  search?: string;
  status?: string;
}

export async function listOrders(query: OrderQuery): Promise<Page<AdminOrder>> {
  return AdminOrderPageSchema.parse(await apiRequest(`/admin/orders${queryString({ ...query })}`));
}

export async function refundOrder(id: string): Promise<OrderDetail> {
  return OrderDetailSchema.parse(
    await apiRequest(`/admin/orders/${id}/refund`, { method: 'POST' }),
  );
}
