import { MerchantDashboardSchema, type MerchantDashboard } from '@rescuebite/types';
import { apiRequest } from '@/lib/request';

export async function getDashboard(): Promise<MerchantDashboard> {
  return MerchantDashboardSchema.parse(await apiRequest('/merchant/dashboard'));
}
