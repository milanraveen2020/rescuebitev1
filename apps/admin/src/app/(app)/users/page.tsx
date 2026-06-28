'use client';

import { useState } from 'react';
import { UserRoleSchema, UserStatusSchema, type AdminUser, type UserRole } from '@rescuebite/types';
import { Button, Modal, useToast } from '@rescuebite/ui/web';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { FilterBar } from '@/components/FilterBar';
import { usePagedData } from '@/components/usePagedData';
import {
  listUsers,
  reactivateUser,
  suspendUser,
  updateUserRole,
  type UserQuery,
} from '@/features/users/api';
import { ApiRequestError } from '@/lib/request';
import { formatDate, humanize } from '@/lib/format';

type UserFilters = Pick<UserQuery, 'search' | 'role' | 'status'>;

export default function UsersPage() {
  const { toast } = useToast();
  const { state, query, filters, setSort, setPage, setFilter, reload } = usePagedData<
    AdminUser,
    UserFilters
  >(listUsers, { search: '', role: '', status: '' });
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [nextRole, setNextRole] = useState<UserRole>('CUSTOMER');
  const [busy, setBusy] = useState(false);

  async function onReactivate(user: AdminUser): Promise<void> {
    try {
      await reactivateUser(user.id);
      toast(`${user.name} reactivated.`, 'success');
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not reactivate.', 'error');
    }
  }

  async function onSuspend(): Promise<void> {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await suspendUser(suspendTarget.id, reason || undefined);
      toast(`${suspendTarget.name} suspended.`, 'neutral');
      setSuspendTarget(null);
      setReason('');
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not suspend.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onChangeRole(): Promise<void> {
    if (!roleTarget) return;
    setBusy(true);
    try {
      await updateUserRole(roleTarget.id, nextRole);
      toast(`Role updated to ${humanize(nextRole)}.`, 'success');
      setRoleTarget(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not change role.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'User',
      sortKey: 'name',
      render: (u) => (
        <div>
          <p className="font-medium text-neutral-900">{u.name}</p>
          <p className="text-xs text-neutral-500">{u.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortKey: 'role', render: (u) => humanize(u.role) },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (u) => <StatusBadge status={u.status} />,
    },
    { key: 'orders', header: 'Orders', align: 'right', render: (u) => u.orderCount },
    { key: 'stores', header: 'Stores', align: 'right', render: (u) => u.storeCount },
    {
      key: 'joined',
      header: 'Joined',
      sortKey: 'createdAt',
      render: (u) => formatDate(u.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRoleTarget(u);
              setNextRole(u.role);
            }}
          >
            Role
          </Button>
          {u.status === 'SUSPENDED' ? (
            <Button size="sm" onClick={() => void onReactivate(u)}>
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setSuspendTarget(u)}>
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Users</h1>
        <p className="text-sm text-muted-foreground">Search, moderate, and manage roles.</p>
      </div>

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search name or email',
        }}
        selects={[
          {
            label: 'Role',
            value: filters.role ?? '',
            onChange: (v) => setFilter('role', v),
            options: UserRoleSchema.options.map((r) => ({ value: r, label: humanize(r) })),
          },
          {
            label: 'Status',
            value: filters.status ?? '',
            onChange: (v) => setFilter('status', v),
            options: UserStatusSchema.options.map((s) => ({ value: s, label: humanize(s) })),
          },
        ]}
      />

      <DataTable
        state={state}
        columns={columns}
        getRowId={(u) => u.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        emptyMessage="No users match your filters."
      />

      <ConfirmDialog
        open={suspendTarget !== null}
        title={`Suspend ${suspendTarget?.name ?? ''}`}
        message="Suspended users cannot sign in or place orders."
        confirmLabel="Suspend"
        destructive
        loading={busy}
        reason={{
          label: 'Reason (optional)',
          value: reason,
          onChange: setReason,
          placeholder: 'Internal note',
        }}
        onConfirm={() => void onSuspend()}
        onClose={() => {
          setSuspendTarget(null);
          setReason('');
        }}
      />

      <Modal
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        title={`Change role — ${roleTarget?.name ?? ''}`}
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-neutral-700">Role</span>
            <select
              value={nextRole}
              onChange={(e) => setNextRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {UserRoleSchema.options.map((r) => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRoleTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onChangeRole()} loading={busy}>
              Save role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
