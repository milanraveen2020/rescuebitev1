'use client';

import { useState } from 'react';
import {
  FoodCategorySchema,
  SUPPORTED_CURRENCIES,
  StoreStatusSchema,
  type AdminStore,
  type UpdateMerchantInput,
} from '@rescuebite/types';
import { Copy, Plus } from 'lucide-react';
import {
  Alert,
  Button,
  FieldGroup,
  Input,
  Modal,
  PageBody,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@rescuebite/ui/web';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { FilterBar } from '@/components/FilterBar';
import { usePagedData } from '@/components/usePagedData';
import {
  approveStore,
  deleteMerchant,
  listStores,
  rejectStore,
  updateMerchant,
  type StoreQuery,
} from '@/features/stores/api';
import { createMerchant } from '@/features/users/api';
import { ApiRequestError } from '@/lib/request';
import { formatDate, humanize } from '@/lib/format';

type StoreFilters = Pick<StoreQuery, 'search' | 'status'>;

export default function StoresPage() {
  const { toast } = useToast();
  const { state, query, filters, setSort, setPage, setFilter, reload } = usePagedData<
    AdminStore,
    StoreFilters
  >(listStores, { search: '', status: '' });
  const [detail, setDetail] = useState<AdminStore | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminStore | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    storeName: '',
    storeAddress: '',
    temporaryPassword: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  /** Shown once after creation so the admin can pass the details on. */
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [editTarget, setEditTarget] = useState<AdminStore | null>(null);
  const [editForm, setEditForm] = useState({
    storeName: '',
    storeAddress: '',
    category: 'OTHER',
    lat: '0',
    lng: '0',
    currency: 'EUR',
    openingHours: '',
    description: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminStore | null>(null);

  function openEdit(store: AdminStore): void {
    setEditError(null);
    setEditForm({
      storeName: store.name,
      storeAddress: store.address,
      category: store.category,
      lat: String(store.lat),
      lng: String(store.lng),
      currency: store.currency,
      openingHours: store.openingHours ?? '',
      description: store.description ?? '',
      ownerName: store.ownerName,
      ownerEmail: store.ownerEmail,
      ownerPhone: '',
    });
    setEditTarget(store);
  }

  async function onSaveEdit(): Promise<void> {
    if (!editTarget) return;
    setBusy(true);
    setEditError(null);
    try {
      await updateMerchant(editTarget.id, {
        storeName: editForm.storeName,
        storeAddress: editForm.storeAddress,
        category: editForm.category as AdminStore['category'],
        lat: Number(editForm.lat),
        lng: Number(editForm.lng),
        openingHours: editForm.openingHours.trim() === '' ? null : editForm.openingHours,
        description: editForm.description.trim() === '' ? null : editForm.description,
        // Only sent when changed — the API rejects a change once orders exist.
        ...(editTarget.currency === editForm.currency
          ? {}
          : { currency: editForm.currency as UpdateMerchantInput['currency'] }),
        ownerName: editForm.ownerName,
        ownerEmail: editForm.ownerEmail,
        ...(editForm.ownerPhone ? { ownerPhone: editForm.ownerPhone } : {}),
      });
      toast('Merchant updated', 'success');
      setEditTarget(null);
      reload();
    } catch (e) {
      setEditError(e instanceof ApiRequestError ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteMerchant(deleteTarget.id);
      toast('Merchant deleted', 'success');
      setDeleteTarget(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not delete.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function onCreateMerchant(): Promise<void> {
    setBusy(true);
    setFormError(null);
    try {
      await createMerchant(form);
      setCreated({ email: form.email, password: form.temporaryPassword });
      setAddOpen(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        storeName: '',
        storeAddress: '',
        temporaryPassword: '',
      });
      reload();
    } catch (e) {
      setFormError(
        e instanceof ApiRequestError ? e.message : 'Could not create the merchant. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(store: AdminStore): Promise<void> {
    try {
      await approveStore(store.id);
      toast(`${store.name} approved.`, 'success');
      setDetail(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not approve.', 'error');
    }
  }

  async function onReject(): Promise<void> {
    if (!rejectTarget) return;
    setBusy(true);
    try {
      await rejectStore(rejectTarget.id, reason);
      toast(`${rejectTarget.name} rejected.`, 'neutral');
      setRejectTarget(null);
      setReason('');
      setDetail(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not reject.', 'error');
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
        <button
          onClick={() => setDetail(s)}
          className="text-left font-medium text-brand-700 hover:underline"
        >
          {s.name}
        </button>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      hideBelow: 'md',
      render: (s) => <span className="text-muted-foreground">{s.ownerEmail}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'rating',
      header: 'Rating',
      sortKey: 'rating',
      align: 'right',
      hideBelow: 'lg',
      // 0 means "no reviews yet", which "0.0" reads as a bad score.
      render: (s) =>
        s.reviewCount === 0 ? (
          <span className="text-subtle-foreground">—</span>
        ) : (
          s.rating.toFixed(1)
        ),
    },
    {
      key: 'listings',
      header: 'Listings',
      align: 'right',
      hideBelow: 'xl',
      render: (s) => s.listingCount,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      hideBelow: 'lg',
      render: (s) => s.orderCount,
    },
    {
      key: 'created',
      header: 'Joined',
      sortKey: 'createdAt',
      hideBelow: 'xl',
      render: (s) => <span className="nums">{formatDate(s.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '1%',
      render: (s) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
            Edit
          </Button>
          <Button variant="danger-outline" size="sm" onClick={() => setDeleteTarget(s)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Stores"
        description="Approve, moderate, and provision stores across the platform."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add merchant
          </Button>
        }
      />

      <FilterBar
        search={{
          value: filters.search ?? '',
          onChange: (v) => setFilter('search', v),
          placeholder: 'Search name or address',
        }}
        selects={[
          {
            label: 'Status',
            allLabel: 'All statuses',
            value: filters.status ?? '',
            onChange: (v) => setFilter('status', v),
            options: StoreStatusSchema.options.map((s) => ({ value: s, label: humanize(s) })),
          },
        ]}
      />

      <DataTable
        state={state}
        columns={columns}
        getRowId={(s) => s.id}
        query={query}
        onSort={setSort}
        onPage={setPage}
        onRetry={reload}
        emptyMessage="No stores match your filters."
      />

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`Edit — ${editTarget?.name ?? ''}`}
      >
        <div className="space-y-5">
          {editError ? <Alert tone="error">{editError}</Alert> : null}

          <FieldGroup legend="Store">
            <Input
              label="Store name"
              value={editForm.storeName}
              onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
            />
            <Input
              label="Address"
              value={editForm.storeAddress}
              onChange={(e) => setEditForm({ ...editForm, storeAddress: e.target.value })}
            />
            <Select
              label="Category"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            >
              {FoodCategorySchema.options.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </Select>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Latitude"
                className="nums"
                value={editForm.lat}
                onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                hint="Needed for customer search"
              />
              <Input
                label="Longitude"
                className="nums"
                value={editForm.lng}
                onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
              />
            </div>
            <Select
              label="Currency"
              value={editForm.currency}
              onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
              disabled={editTarget?.currencyLocked ?? false}
              hint={
                editTarget?.currencyLocked
                  ? 'Locked — this store has orders whose totals are stored in the original currency.'
                  : 'Every customer-facing price for this store renders in this currency.'
              }
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label} ({c.symbol})
                </option>
              ))}
            </Select>
            <Input
              label="Opening hours"
              value={editForm.openingHours}
              onChange={(e) => setEditForm({ ...editForm, openingHours: e.target.value })}
              placeholder="Mon–Sat 8–20"
              hint="Shown to customers on every bag from this store."
            />
            <Textarea
              label="Store description"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              hint="Customer-facing blurb. Leave blank to let the merchant write their own."
            />
          </FieldGroup>

          <FieldGroup legend="Owner">
            <Input
              label="Name"
              value={editForm.ownerName}
              onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={editForm.ownerEmail}
              onChange={(e) => setEditForm({ ...editForm, ownerEmail: e.target.value })}
              hint="Changing this changes their sign-in address."
            />
            <Input
              label="Phone"
              value={editForm.ownerPhone}
              onChange={(e) => setEditForm({ ...editForm, ownerPhone: e.target.value })}
              hint="Leave blank to keep the current number."
            />
          </FieldGroup>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onSaveEdit()} loading={busy}>
              Save changes
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.name ?? ''}?`}
        message={
          deleteTarget && deleteTarget.orderCount > 0
            ? `This store has ${deleteTarget.orderCount} order(s), so it can't be deleted. Reject it instead to take it off the platform.`
            : 'This permanently removes the store and its owner account. This cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={() => void onConfirmDelete()}
        onClose={() => setDeleteTarget(null)}
      />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add merchant">
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Creates the merchant owner and their store, already approved. They&rsquo;ll set their
            own password the first time they sign in, then complete store setup.
          </p>
          {formError ? <Alert tone="error">{formError}</Alert> : null}

          {/* Grouped: who the person is, what the store is, how they get in. */}
          <FieldGroup legend="Owner">
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nadia Baker"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nadia@bakery.com"
              />
              <Input
                label="Phone number"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+94 77 123 4567"
              />
            </div>
          </FieldGroup>

          <FieldGroup legend="Store">
            <Input
              label="Store name"
              required
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              placeholder="Nadia's Bakery"
            />
            <Input
              label="Store address"
              required
              value={form.storeAddress}
              onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
              placeholder="14 Dame St, Dublin 2"
            />
          </FieldGroup>

          <FieldGroup legend="First sign-in">
            <Input
              label="Temporary password"
              required
              value={form.temporaryPassword}
              onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
              hint="At least 8 characters. They must change it on first login."
              placeholder="TempPass123!"
            />
          </FieldGroup>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onCreateMerchant()} loading={busy}>
              Create merchant
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={created !== null} onClose={() => setCreated(null)} title="Merchant created">
        <div className="space-y-4">
          {/*
            One-time credentials are the highest-stakes thing in this console: if
            the admin closes this without copying them, the merchant is locked out.
            Warning tone plus a copy button, not a grey definition list.
          */}
          <Alert tone="warning" title="Copy these now">
            The temporary password is not stored and will not be shown again.
          </Alert>
          <dl className="divide-y divide-line rounded-md border border-line bg-surface-raised text-sm">
            <div className="flex items-center justify-between gap-4 p-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="select-all font-mono font-semibold text-neutral-900">
                {created?.email}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 p-3">
              <dt className="text-muted-foreground">Temporary password</dt>
              <dd className="select-all font-mono font-semibold text-neutral-900">
                {created?.password}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (!created) return;
                void navigator.clipboard
                  .writeText(`${created.email} / ${created.password}`)
                  .then(() => toast('Credentials copied.', 'success'))
                  .catch(() => toast('Could not copy — select the values instead.', 'error'));
              }}
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy both
            </Button>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </div>
        </div>
      </Modal>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail ? (
          <div className="space-y-3 text-sm">
            <Row label="Status" value={<StatusBadge status={detail.status} />} />
            <Row label="Owner" value={`${detail.ownerName} · ${detail.ownerEmail}`} />
            <Row label="Category" value={humanize(detail.category)} />
            <Row label="Address" value={detail.address} />
            <Row label="Payouts" value={detail.payoutsEnabled ? 'Enabled' : 'Not enabled'} />
            <Row label="Stripe" value={detail.stripeAccountId ?? 'Not connected'} />
            <Row
              label="Listings / Orders"
              value={`${detail.listingCount} / ${detail.orderCount}`}
            />
            {detail.status === 'PENDING' ? (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setRejectTarget(detail)}>
                  Reject
                </Button>
                <Button onClick={() => void onApprove(detail)}>Approve</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={rejectTarget !== null}
        title="Reject store"
        confirmLabel="Reject"
        destructive
        loading={busy}
        reason={{ label: 'Reason', value: reason, onChange: setReason, required: true }}
        onConfirm={() => void onReject()}
        onClose={() => {
          setRejectTarget(null);
          setReason('');
        }}
      />
    </PageBody>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-neutral-800">{value}</span>
    </div>
  );
}
