import { MerchantAnalyticsSchema, type MerchantAnalytics } from '@rescuebite/types';
import { apiRequest } from '@/lib/request';

export async function getAnalytics(days = 14): Promise<MerchantAnalytics> {
  return MerchantAnalyticsSchema.parse(await apiRequest(`/merchant/analytics?days=${days}`));
}
