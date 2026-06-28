'use client';

import { useState } from 'react';
import { FoodCategorySchema, UpdateStoreSchema, type UpdateStoreInput } from '@rescuebite/types';
import { Button, Card, Input, useToast } from '@rescuebite/ui/web';
import { useSession } from '@/features/shell/SessionContext';
import { updateStore } from '@/features/store/api';
import { uploadListingImage } from '@/features/listings/api';
import { ApiRequestError } from '@/lib/request';
import { humanize } from '@/lib/format';

const CATEGORIES = FoodCategorySchema.options;
const inputClass =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

export default function StorePage() {
  const { store, setStore } = useSession();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: store.name,
    description: store.description ?? '',
    category: store.category,
    address: store.address,
    lat: String(store.lat),
    lng: String(store.lng),
    openingHours: store.openingHours ?? '',
    logoUrl: store.logoUrl ?? '',
    coverUrl: store.coverUrl ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onUpload(kind: 'logo' | 'cover', file: File | undefined): Promise<void> {
    if (!file) return;
    setUploading(kind);
    setFormError(null);
    try {
      const url = await uploadListingImage(file);
      set(kind === 'logo' ? 'logoUrl' : 'coverUrl', url);
    } catch (e) {
      setFormError(e instanceof ApiRequestError ? e.message : 'Image upload failed.');
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const payload: UpdateStoreInput = {
      name: form.name,
      description: form.description.trim() === '' ? null : form.description,
      category: form.category,
      address: form.address,
      lat: Number.parseFloat(form.lat),
      lng: Number.parseFloat(form.lng),
      openingHours: form.openingHours.trim() === '' ? null : form.openingHours,
      logoUrl: form.logoUrl.trim() === '' ? null : form.logoUrl,
      coverUrl: form.coverUrl.trim() === '' ? null : form.coverUrl,
    };

    const parsed = UpdateStoreSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateStore(parsed.data);
      setStore(updated);
      toast('Store profile saved.', 'success');
    } catch (e) {
      setFormError(e instanceof ApiRequestError ? e.message : 'Could not save your store.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
          Store profile
        </h1>
        <p className="text-sm text-muted-foreground">How your store appears to customers.</p>
      </header>

      <Card>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
          {formError ? (
            <p role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
              {formError}
            </p>
          ) : null}

          <Input
            label="Store name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            errorText={errors.name}
          />

          <Field label="Description" error={errors.description}>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Tell customers about your store."
            />
          </Field>

          <Field label="Category" error={errors.category}>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => set('category', e.target.value as (typeof CATEGORIES)[number])}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </select>
          </Field>

          <Input
            label="Address"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            errorText={errors.address}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              inputMode="decimal"
              value={form.lat}
              onChange={(e) => set('lat', e.target.value)}
              errorText={errors.lat}
            />
            <Input
              label="Longitude"
              inputMode="decimal"
              value={form.lng}
              onChange={(e) => set('lng', e.target.value)}
              errorText={errors.lng}
            />
          </div>

          <Input
            label="Opening hours"
            value={form.openingHours}
            onChange={(e) => set('openingHours', e.target.value)}
            errorText={errors.openingHours}
            placeholder="e.g. Mon–Fri 9–18, Sat 10–16"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <ImageField
              label="Logo"
              url={form.logoUrl}
              uploading={uploading === 'logo'}
              onPick={(file) => void onUpload('logo', file)}
              className="h-20 w-20 rounded-full"
            />
            <ImageField
              label="Cover"
              url={form.coverUrl}
              uploading={uploading === 'cover'}
              onPick={(file) => void onUpload('cover', file)}
              className="h-20 w-full rounded-md"
            />
          </div>

          <Button type="submit" loading={saving} disabled={uploading !== null}>
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}

function ImageField({
  label,
  url,
  uploading,
  onPick,
  className,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onPick: (file: File | undefined) => void;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-neutral-700">{label}</span>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${label} preview`}
          className={`${className} border border-neutral-200 object-cover`}
        />
      ) : (
        <div
          className={`${className} flex items-center justify-center border border-dashed border-neutral-300 text-xs text-neutral-400`}
        >
          None
        </div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => onPick(e.target.files?.[0])}
        className="text-sm"
      />
      {uploading ? <p className="text-sm text-muted-foreground">Uploading…</p> : null}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger-600">{error}</span> : null}
    </label>
  );
}
