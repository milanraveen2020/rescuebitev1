import { AdminOverviewSchema, type AdminOverview } from '@rescuebite/types';
import { apiRequest, queryString } from '@/lib/request';

export async function getOverview(from?: string, to?: string): Promise<AdminOverview> {
  return AdminOverviewSchema.parse(await apiRequest(`/admin/overview${queryString({ from, to })}`));
}
