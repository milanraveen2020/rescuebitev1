'use client';

import type { AuditLogEntry } from '@rescuebite/types';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { usePagedData } from '@/components/usePagedData';
import { listAuditLogs, type AuditQuery } from '@/features/audit/api';
import { formatDateTime } from '@/lib/format';

type AuditFilters = Pick<AuditQuery, 'entity' | 'action'>;

const ENTITIES = ['Store', 'User', 'Listing', 'Order', 'Review', 'PlatformSettings'];

export default function AuditPage() {
  const { state, query, filters, setSort, setPage, setFilter } = usePagedData<
    AuditLogEntry,
    AuditFilters
  >(listAuditLogs, { entity: '', action: '' });

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'time',
      header: 'When',
      sortKey: 'createdAt',
      render: (l) => formatDateTime(l.createdAt),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (l) => <span className="text-neutral-600">{l.actorEmail ?? '—'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => <span className="font-mono text-xs text-neutral-800">{l.action}</span>,
    },
    { key: 'entity', header: 'Entity', render: (l) => l.entity },
    {
      key: 'entityId',
      header: 'Target',
      render: (l) => <span className="font-mono text-xs text-neutral-500">{l.entityId}</span>,
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (l) =>
        l.metadata ? (
          <code className="line-clamp-1 max-w-xs text-xs text-neutral-500">
            {JSON.stringify(l.metadata)}
          </code>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every administrative action, recorded immutably.
        </p>
      </div>

      <FilterBar
        search={{
          value: filters.action ?? '',
          onChange: (v) => setFilter('action', v),
          placeholder: 'Filter by action (e.g. store.approve)',
        }}
        selects={[
          {
            label: 'Entity',
            value: filters.entity ?? '',
            onChange: (v) => setFilter('entity', v),
            options: ENTITIES.map((e) => ({ value: e, label: e })),
          },
        ]}
      />

      <DataTable
        state={state}
        columns={columns}
        getRowId={(l) => l.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        emptyMessage="No audit entries match your filters."
      />
    </div>
  );
}
