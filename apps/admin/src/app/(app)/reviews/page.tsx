'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import type { AdminReview } from '@rescuebite/types';
import { Badge, Button, useToast } from '@rescuebite/ui/web';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FilterBar } from '@/components/FilterBar';
import { usePagedData } from '@/components/usePagedData';
import { hideReview, listReviews, removeReview, unhideReview } from '@/features/reviews/api';
import { ApiRequestError } from '@/lib/request';
import { formatDate } from '@/lib/format';

type ReviewFilters = { search?: string; hidden?: string };

export default function ReviewsPage() {
  const { toast } = useToast();
  const { state, query, filters, setSort, setPage, setFilter, reload } = usePagedData<
    AdminReview,
    ReviewFilters
  >(listReviews, { search: '', hidden: '' });
  const [hideTarget, setHideTarget] = useState<AdminReview | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminReview | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function onUnhide(review: AdminReview): Promise<void> {
    try {
      await unhideReview(review.id);
      toast('Review restored.', 'success');
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not restore.', 'error');
    }
  }

  async function onHide(): Promise<void> {
    if (!hideTarget) return;
    setBusy(true);
    try {
      await hideReview(hideTarget.id, reason || undefined);
      toast('Review hidden.', 'neutral');
      setHideTarget(null);
      setReason('');
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not hide.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(): Promise<void> {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await removeReview(removeTarget.id);
      toast('Review removed.', 'neutral');
      setRemoveTarget(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not remove.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminReview>[] = [
    {
      key: 'rating',
      header: 'Rating',
      sortKey: 'rating',
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-medium text-neutral-800">
          <Star className="h-4 w-4 fill-accent-400 text-accent-400" /> {r.rating}
        </span>
      ),
    },
    {
      key: 'comment',
      header: 'Comment',
      render: (r) => (
        <span className="line-clamp-2 max-w-md text-neutral-700">
          {r.comment ?? <em className="text-neutral-400">No comment</em>}
        </span>
      ),
    },
    { key: 'store', header: 'Store', render: (r) => r.storeName },
    { key: 'customer', header: 'By', render: (r) => r.customerName },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (r) =>
        r.hiddenAt ? <Badge tone="danger">Hidden</Badge> : <Badge tone="brand">Visible</Badge>,
    },
    {
      key: 'created',
      header: 'Date',
      sortKey: 'createdAt',
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {r.hiddenAt ? (
            <Button size="sm" variant="ghost" onClick={() => void onUnhide(r)}>
              Unhide
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setHideTarget(r)}>
              Hide
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={() => setRemoveTarget(r)}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Reviews</h1>
        <p className="text-sm text-muted-foreground">Moderate abusive or inappropriate reviews.</p>
      </div>

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search comments',
        }}
        selects={[
          {
            label: 'Visibility',
            value: filters.hidden ?? '',
            onChange: (v) => setFilter('hidden', v),
            options: [
              { value: 'false', label: 'Visible' },
              { value: 'true', label: 'Hidden' },
            ],
          },
        ]}
      />

      <DataTable
        state={state}
        columns={columns}
        getRowId={(r) => r.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        emptyMessage="No reviews match your filters."
      />

      <ConfirmDialog
        open={hideTarget !== null}
        title="Hide review"
        message="Hidden reviews are removed from the store page and excluded from its rating."
        confirmLabel="Hide"
        loading={busy}
        reason={{ label: 'Reason (optional)', value: reason, onChange: setReason }}
        onConfirm={() => void onHide()}
        onClose={() => {
          setHideTarget(null);
          setReason('');
        }}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove review"
        message="This permanently deletes the review. This cannot be undone."
        confirmLabel="Remove"
        destructive
        loading={busy}
        onConfirm={() => void onRemove()}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}
