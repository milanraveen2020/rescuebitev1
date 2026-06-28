import {
  StaffInviteResultSchema,
  StaffMemberSchema,
  type InviteStaffInput,
  type StaffInviteResult,
  type StaffMember,
} from '@rescuebite/types';
import { apiRequest, apiRequestVoid, jsonInit } from '@/lib/request';

export async function listStaff(): Promise<StaffMember[]> {
  return StaffMemberSchema.array().parse(await apiRequest('/merchant/staff'));
}

export async function inviteStaff(input: InviteStaffInput): Promise<StaffInviteResult> {
  return StaffInviteResultSchema.parse(
    await apiRequest('/merchant/staff', jsonInit('POST', input)),
  );
}

export async function removeStaff(id: string): Promise<void> {
  await apiRequestVoid(`/merchant/staff/${id}`, { method: 'DELETE' });
}
