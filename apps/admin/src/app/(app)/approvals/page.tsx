'use client';

import { useState } from 'react';
import type { AdminStore } from '@rescuebite/types';
import { Button, useToast } from '@rescuebite/ui/web';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedData } from '@/components/usePagedData';
import {
  approveStore,
  bulkApproveStores,
  listStores,
  rejectStore,
  type StoreQuery,
} from '@/features/stores/api';
import { ApiRequestError } from '@/lib/request';
import { formatDate, humanize } from '@/lib/format';

type Dialog = { kind: 'reject'; store: AdminStore } | { kind: 'bulk'; ids: string[] } | null;

export default function ApprovalsPage() {
  const { toast } = useToast();
  const { state, query, setSort, setPage, reload } = usePagedData<
    AdminStore,
    Pick<StoreQuery, 'status'>
  >(listStores, { status: 'PENDING' }, { sortBy: 'createdAt', sortOrder: 'asc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(ids: string[]): void {
    setSelected((prev) => (ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)));
  }

  async function onApprove(store: AdminStore): Promise<void> {
    try {
      await approveStore(store.id);
      toast(`${store.name} approved.`, 'success');
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not approve.', 'error');
    }
  }

  async function onConfirm(): Promise<void> {
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.kind === 'reject') {
        await rejectStore(dialog.store.id, reason);
        toast(`${dialog.store.name} rejected.`, 'neutral');
      } else {
        const { affected } = await bulkApproveStores(dialog.ids);
        toast(`Approved ${affected} store${affected === 1 ? '' : 's'}.`, 'success');
        setSelected(new Set());
      }
      setDialog(null);
      setReason('');
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Action failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminStore>[] = [
    {
      key: 'name',
      header: 'Store',
      sortKey: 'name',
      render: (s) => (
        <div>
          <p className="font-medium text-neutral-900">{s.name}</p>
          <p className="text-xs text-neutral-500">{s.address}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (s) => <span className="text-neutral-600">{s.ownerEmail}</span>,
    },
    { key: 'category', header: 'Category', render: (s) => humanize(s.category) },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'created',
      header: 'Requested',
      sortKey: 'createdAt',
      render: (s) => formatDate(s.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) =>
        s.status === 'PENDING' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => void onApprove(s)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDialog({ kind: 'reject', store: s })}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
          Merchant approvals
        </h1>
        <p className="text-sm text-muted-foreground">Pending stores awaiting review.</p>
      </div>

      <DataTable
        state={state}
        columns={columns}
        getRowId={(s) => s.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        emptyMessage="No stores are awaiting approval."
        selection={{
          selected,
          onToggle: toggle,
          onToggleAll: toggleAll,
          actions: (
            <Button size="sm" onClick={() => setDialog({ kind: 'bulk', ids: [...selected] })}>
              Approve selected
            </Button>
          ),
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === 'reject'}
        title="Reject store"
        message="The merchant will see this store as rejected. A reason is required."
        confirmLabel="Reject"
        destructive
        loading={busy}
        reason={{
          label: 'Reason',
          value: reason,
          onChange: setReason,
          required: true,
          placeholder: 'Why is this store being rejected?',
        }}
        onConfirm={() => void onConfirm()}
        onClose={() => {
          setDialog(null);
          setReason('');
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === 'bulk'}
        title="Approve selected stores"
        message={`Approve ${dialog?.kind === 'bulk' ? dialog.ids.length : 0} store(s)? Only pending stores are affected.`}
        confirmLabel="Approve all"
        loading={busy}
        onConfirm={() => void onConfirm()}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
