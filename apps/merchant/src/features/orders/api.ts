import {
  OrderDetailSchema,
  StoreOrdersSchema,
  type OrderDetail,
  type StoreOrders,
} from '@rescuebite/types';
import { apiRequest, jsonInit } from '@/lib/request';

export async function getStoreOrders(storeId: string): Promise<StoreOrders> {
  return StoreOrdersSchema.parse(await apiRequest(`/stores/${storeId}/orders`));
}

export async function collectOrder(orderId: string, pickupCode: string): Promise<OrderDetail> {
  return OrderDetailSchema.parse(
    await apiRequest(`/orders/${orderId}/collect`, jsonInit('POST', { pickupCode })),
  );
}

export async function markNoShow(orderId: string): Promise<OrderDetail> {
  return OrderDetailSchema.parse(
    await apiRequest(`/orders/${orderId}/no-show`, { method: 'POST' }),
  );
}
