'use client';

import { useState } from 'react';
import { ImagePlus, Loader2, MapPin } from 'lucide-react';
import {
  FoodCategorySchema,
  SUPPORTED_CURRENCIES,
  UpdateStoreSchema,
  type UpdateStoreInput,
} from '@rescuebite/types';
import {
  Alert,
  Button,
  FieldGroup,
  FormActions,
  Input,
  PageBody,
  PageHeader,
  Section,
  Select,
  Textarea,
  useToast,
} from '@rescuebite/ui/web';
import { useSession } from '@/features/shell/SessionContext';
import { updateStore } from '@/features/store/api';
import { uploadListingImage } from '@/features/listings/api';
import { ApiRequestError } from '@/lib/request';
import { humanize } from '@/lib/format';

const CATEGORIES = FoodCategorySchema.options;

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
    currency: store.currency,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Server-derived: the store has taken orders, so its currency is frozen.
  const currencyLocked = store.currencyLocked;

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
      // Only send the currency when it actually changed: the API rejects a change
      // once the store has orders, and resending the same value would trip that.
      ...(form.currency === store.currency
        ? {}
        : { currency: form.currency as UpdateStoreInput['currency'] }),
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
    <PageBody>
      <PageHeader
        title="Store profile"
        description="How your store appears to customers browsing for surprise bags."
      />

      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        {formError ? (
          <Alert tone="error" className="mb-6">
            {formError}
          </Alert>
        ) : null}

        {/*
          Grouped into the four questions a merchant actually answers — who you
          are, where you are, when you're open, how you look — instead of one
          undifferentiated column of nine inputs.
        */}
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <Section title="Basics" description="Your name and what you sell.">
            <FieldGroup legend="Identity" className="[&>legend]:sr-only">
              <Input
                label="Store name"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                errorText={errors.name}
              />
              <Textarea
                label="Description"
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                errorText={errors.description}
                placeholder="Tell customers what kind of surplus they can expect."
                hint="Shown on your store page. Keep it short and warm."
              />
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => set('category', e.target.value as (typeof CATEGORIES)[number])}
                errorText={errors.category}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {humanize(c)}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </Section>

          <Section title="Location & hours" description="Where and when customers collect.">
            <div className="space-y-4">
              <Input
                label="Address"
                required
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                errorText={errors.address}
                leading={<MapPin className="h-4 w-4" aria-hidden />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Latitude"
                  inputMode="decimal"
                  className="nums"
                  value={form.lat}
                  onChange={(e) => set('lat', e.target.value)}
                  errorText={errors.lat}
                />
                <Input
                  label="Longitude"
                  inputMode="decimal"
                  className="nums"
                  value={form.lng}
                  onChange={(e) => set('lng', e.target.value)}
                  errorText={errors.lng}
                />
              </div>
              {/* Coordinates decide whether the store shows in nearby search at all. */}
              <p className="rounded-md bg-surface-raised p-3 text-xs text-muted-foreground">
                Coordinates place your store on the customer map. Without them your store will not
                appear in nearby search.
              </p>
              <Input
                label="Opening hours"
                value={form.openingHours}
                onChange={(e) => set('openingHours', e.target.value)}
                errorText={errors.openingHours}
                placeholder="Mon–Fri 9–18, Sat 10–16"
                hint="Free text — write it the way you'd tell a customer. Shown on every bag."
              />

              <Select
                label="Currency"
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                errorText={errors.currency}
                disabled={currencyLocked}
                hint={
                  currencyLocked
                    ? 'Locked because this store already has orders — past totals are stored in the original currency.'
                    : 'Every price customers see uses this currency. Set it before you take your first order.'
                }
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label} ({c.symbol})
                  </option>
                ))}
              </Select>
            </div>
          </Section>
        </div>

        <Section
          title="Branding"
          description="A logo and cover photo make your listings far more appealing."
          className="mt-6"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <ImageField
              label="Logo"
              hint="Square, at least 200×200px."
              url={form.logoUrl}
              uploading={uploading === 'logo'}
              onPick={(file) => void onUpload('logo', file)}
              previewClassName="h-24 w-24 rounded-full"
            />
            <ImageField
              label="Cover photo"
              hint="Wide, at least 1200×400px."
              url={form.coverUrl}
              uploading={uploading === 'cover'}
              onPick={(file) => void onUpload('cover', file)}
              previewClassName="h-24 w-full rounded-md"
            />
          </div>

          <FormActions>
            <Button type="submit" loading={saving} disabled={uploading !== null}>
              Save changes
            </Button>
            <span className="text-sm text-muted-foreground">
              {uploading
                ? 'Waiting for the image upload to finish…'
                : 'Changes go live immediately.'}
            </span>
          </FormActions>
        </Section>
      </form>
    </PageBody>
  );
}

function ImageField({
  label,
  hint,
  url,
  uploading,
  onPick,
  previewClassName,
}: {
  label: string;
  hint: string;
  url: string;
  uploading: boolean;
  onPick: (file: File | undefined) => void;
  previewClassName: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-800">{label}</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${label} preview`}
          className={`${previewClassName} border border-line object-cover`}
        />
      ) : (
        <div
          className={`${previewClassName} flex items-center justify-center border border-dashed border-line-strong bg-surface-raised text-subtle-foreground`}
        >
          <ImagePlus className="h-5 w-5" aria-hidden />
        </div>
      )}
      {/*
        A bare file input is unstyleable and inconsistent across browsers, so the
        real control is visually hidden behind a label styled as a button.
      */}
      <div className="flex items-center gap-3">
        <label className="inline-flex min-h-[2.25rem] cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-surface-card px-3 text-sm font-semibold text-neutral-700 transition hover:bg-surface-raised focus-within:ring-2 focus-within:ring-brand-500">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onPick(e.target.files?.[0])}
            className="sr-only"
          />
          {url ? 'Replace' : 'Upload'}
          <span className="sr-only"> {label}</span>
        </label>
        {uploading ? (
          <span role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Uploading…
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
    </div>
  );
}
