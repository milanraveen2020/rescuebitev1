import {
  AdminUserPageSchema,
  AdminUserSchema,
  type AdminUser,
  type SortOrder,
  type UserRole,
} from '@rescuebite/types';
import { apiRequest, jsonInit, queryString } from '@/lib/request';
import type { Page } from '@/components/usePagedData';

export interface UserQuery {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder: SortOrder;
  search?: string;
  role?: string;
  status?: string;
}

export async function listUsers(query: UserQuery): Promise<Page<AdminUser>> {
  return AdminUserPageSchema.parse(await apiRequest(`/admin/users${queryString({ ...query })}`));
}

export async function suspendUser(id: string, reason?: string): Promise<AdminUser> {
  return AdminUserSchema.parse(
    await apiRequest(`/admin/users/${id}/suspend`, jsonInit('POST', { reason })),
  );
}

export async function reactivateUser(id: string): Promise<AdminUser> {
  return AdminUserSchema.parse(
    await apiRequest(`/admin/users/${id}/reactivate`, { method: 'POST' }),
  );
}

export async function updateUserRole(id: string, role: UserRole): Promise<AdminUser> {
  return AdminUserSchema.parse(
    await apiRequest(`/admin/users/${id}/role`, jsonInit('PATCH', { role })),
  );
}
