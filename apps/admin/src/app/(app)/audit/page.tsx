'use client';

import type { AuditLogEntry } from '@rescuebite/types';
import { PageBody, PageHeader } from '@rescuebite/ui/web';
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
      render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.entityId}</span>,
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (l) =>
        l.metadata ? (
          <code className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
            {JSON.stringify(l.metadata)}
          </code>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Audit log"
        description="Every administrative action, recorded immutably."
      />

      <FilterBar
        search={{
          value: filters.action ?? '',
          onChange: (v) => setFilter('action', v),
          placeholder: 'Filter by action (e.g. store.approve)',
        }}
        selects={[
          {
            label: 'Entity',
            allLabel: 'All entities',
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
    </PageBody>
  );
}
