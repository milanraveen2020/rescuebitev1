'use client';

import { useState } from 'react';
import { UserRoleSchema, UserStatusSchema, type AdminUser, type UserRole } from '@rescuebite/types';
import { Button, Modal, PageBody, PageHeader, Select, useToast } from '@rescuebite/ui/web';
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
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortKey: 'role',
      hideBelow: 'sm',
      render: (u) => <span className="text-neutral-800">{humanize(u.role)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      hideBelow: 'lg',
      render: (u) => u.orderCount,
    },
    {
      key: 'stores',
      header: 'Stores',
      align: 'right',
      hideBelow: 'lg',
      render: (u) => u.storeCount,
    },
    {
      key: 'joined',
      header: 'Joined',
      sortKey: 'createdAt',
      hideBelow: 'md',
      render: (u) => <span className="nums">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '1%',
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRoleTarget(u);
              setNextRole(u.role);
            }}
          >
            Role
          </Button>
          {/* Reactivate is constructive; suspend is destructive but not the default. */}
          {u.status === 'SUSPENDED' ? (
            <Button size="sm" onClick={() => void onReactivate(u)}>
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="danger-outline" onClick={() => setSuspendTarget(u)}>
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Users"
        description="Search, moderate, and manage roles across the platform."
      />

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search name or email',
        }}
        selects={[
          {
            label: 'Role',
            allLabel: 'All roles',
            value: filters.role ?? '',
            onChange: (v) => setFilter('role', v),
            options: UserRoleSchema.options.map((r) => ({ value: r, label: humanize(r) })),
          },
          {
            label: 'Status',
            allLabel: 'All statuses',
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
        onRetry={reload}
        emptyMessage="No users match your filters."
        emptyDescription="Try clearing the search or filters above."
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
          <Select
            label="Role"
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as UserRole)}
            hint="Changing a role takes effect the next time they sign in."
          >
            {UserRoleSchema.options.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </Select>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setRoleTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onChangeRole()} loading={busy}>
              Save role
            </Button>
          </div>
        </div>
      </Modal>
    </PageBody>
  );
}
