import { StoreSchema, type Store, type UpdateStoreInput } from '@rescuebite/types';
import { apiRequest, jsonInit } from '@/lib/request';

export async function getStore(): Promise<Store> {
  return StoreSchema.parse(await apiRequest('/merchant/store'));
}

export async function updateStore(input: UpdateStoreInput): Promise<Store> {
  return StoreSchema.parse(await apiRequest('/merchant/store', jsonInit('PATCH', input)));
}
