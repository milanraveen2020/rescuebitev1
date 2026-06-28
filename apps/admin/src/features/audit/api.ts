import { AuditLogPageSchema, type AuditLogEntry, type SortOrder } from '@rescuebite/types';
import { apiRequest, queryString } from '@/lib/request';
import type { Page } from '@/components/usePagedData';

export interface AuditQuery {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
  entity?: string;
  action?: string;
}

export async function listAuditLogs(query: AuditQuery): Promise<Page<AuditLogEntry>> {
  return AuditLogPageSchema.parse(
    await apiRequest(`/admin/audit-logs${queryString({ ...query })}`),
  );
}
