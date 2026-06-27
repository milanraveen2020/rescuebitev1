'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreateListingSchema,
  FoodCategorySchema,
  UpdateListingSchema,
  type Listing,
} from '@rescuebite/types';
import { Button, Input, PriceTag } from '@rescuebite/ui/web';
import { ListingApiError, createListing, updateListing, uploadListingImage } from './api';

interface Props {
  mode: 'create' | 'edit';
  initial?: Listing;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  originalPrice: string; // major units, e.g. "15.00"
  price: string;
  quantityTotal: string;
  pickupStart: string; // datetime-local
  pickupEnd: string;
  imageUrl: string;
  publish: boolean;
}

const CATEGORIES = FoodCategorySchema.options;

function toMinor(major: string): number {
  return Math.round(Number.parseFloat(major) * 100);
}
function toMajor(minor: number): string {
  return (minor / 100).toFixed(2);
}
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialState(initial?: Listing): FormState {
  return {
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? CATEGORIES[0],
    originalPrice: initial ? toMajor(initial.originalPrice) : '',
    price: initial ? toMajor(initial.price) : '',
    quantityTotal: initial ? String(initial.quantityTotal) : '1',
    pickupStart: initial ? toLocalInput(initial.pickupStart) : '',
    pickupEnd: initial ? toLocalInput(initial.pickupEnd) : '',
    imageUrl: initial?.imageUrl ?? '',
    publish: initial ? initial.status === 'ACTIVE' : false,
  };
}

export function ListingForm({ mode, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Live price / discount preview.
  const preview = useMemo(() => {
    const original = toMinor(form.originalPrice);
    const price = toMinor(form.price);
    if (!Number.isFinite(original) || !Number.isFinite(price) || original <= 0 || price < 0) {
      return null;
    }
    const percent = price <= original ? Math.round((1 - price / original) * 100) : 0;
    return { original, price, percent, invalid: price > original };
  }, [form.originalPrice, form.price]);

  async function onImageChange(file: File | undefined): Promise<void> {
    if (!file) return;
    setFormError(null);
    setUploading(true);
    try {
      set('imageUrl', await uploadListingImage(file));
    } catch (e) {
      setFormError(e instanceof ListingApiError ? e.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function buildPayload() {
    return {
      title: form.title,
      description: form.description || undefined,
      category: form.category as Listing['category'],
      originalPrice: toMinor(form.originalPrice),
      price: toMinor(form.price),
      quantityTotal: Number.parseInt(form.quantityTotal, 10),
      pickupStart: form.pickupStart ? new Date(form.pickupStart).toISOString() : '',
      pickupEnd: form.pickupEnd ? new Date(form.pickupEnd).toISOString() : '',
      imageUrl: form.imageUrl || undefined,
      status: form.publish ? ('ACTIVE' as const) : ('DRAFT' as const),
    };
  }

  function applyZodErrors(issues: { path: (string | number)[]; message: string }[]): void {
    const fieldErrors: Record<string, string> = {};
    for (const issue of issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    setErrors(fieldErrors);
  }

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const payload = buildPayload();
    // Validate per mode so the parsed type narrows to the right input shape.
    if (mode === 'create') {
      const parsed = CreateListingSchema.safeParse(payload);
      if (!parsed.success) return applyZodErrors(parsed.error.issues);
      await submit(() => createListing(parsed.data));
    } else if (initial) {
      const parsed = UpdateListingSchema.safeParse(payload);
      if (!parsed.success) return applyZodErrors(parsed.error.issues);
      await submit(() => updateListing(initial.id, parsed.data));
    }
  }

  async function submit(action: () => Promise<unknown>): Promise<void> {
    setSubmitting(true);
    try {
      await action();
      router.push('/listings');
      router.refresh();
    } catch (e) {
      if (e instanceof ListingApiError && e.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.fieldErrors)) mapped[k] = v[0] ?? 'Invalid';
        setErrors(mapped);
      }
      setFormError(e instanceof ListingApiError ? e.message : 'Could not save the listing.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-2xl space-y-5 p-6" noValidate>
      <h1 className="font-display text-2xl font-bold text-brand-700">
        {mode === 'create' ? 'New surprise bag' : 'Edit surprise bag'}
      </h1>

      {formError ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <Input
        label="Title"
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        errorText={errors.title}
        placeholder="e.g. Bakery Surprise Bag"
      />

      <Field label="Description" error={errors.description}>
        <textarea
          className={inputClass}
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What might be inside?"
        />
      </Field>

      <Field label="Category" error={errors.category}>
        <select
          className={inputClass}
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Original price (€)"
          inputMode="decimal"
          value={form.originalPrice}
          onChange={(e) => set('originalPrice', e.target.value)}
          errorText={errors.originalPrice}
          placeholder="15.00"
        />
        <Input
          label="Discounted price (€)"
          inputMode="decimal"
          value={form.price}
          onChange={(e) => set('price', e.target.value)}
          errorText={errors.price}
          placeholder="5.00"
        />
      </div>

      {preview ? (
        preview.invalid ? (
          <p className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            Discounted price cannot exceed the original price.
          </p>
        ) : (
          <div className="rounded-md bg-brand-50 p-3">
            <PriceTag originalMinor={preview.original} priceMinor={preview.price} />
          </div>
        )
      ) : null}

      <Input
        label="Quantity available"
        type="number"
        min={1}
        value={form.quantityTotal}
        onChange={(e) => set('quantityTotal', e.target.value)}
        errorText={errors.quantityTotal}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Pickup start"
          type="datetime-local"
          value={form.pickupStart}
          onChange={(e) => set('pickupStart', e.target.value)}
          errorText={errors.pickupStart}
        />
        <Input
          label="Pickup end"
          type="datetime-local"
          value={form.pickupEnd}
          onChange={(e) => set('pickupEnd', e.target.value)}
          errorText={errors.pickupEnd}
        />
      </div>

      <Field label="Image" error={undefined}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void onImageChange(e.target.files?.[0])}
          className="text-sm"
        />
        {uploading ? <p className="text-sm text-muted-foreground">Uploading…</p> : null}
        {form.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.imageUrl} alt="Listing preview" className="mt-2 h-24 rounded-md object-cover" />
        ) : null}
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.publish}
          onChange={(e) => set('publish', e.target.checked)}
        />
        Publish now (otherwise saved as draft)
      </label>

      <div className="flex gap-3">
        <Button type="submit" loading={submitting} disabled={uploading}>
          {mode === 'create' ? 'Create listing' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/listings')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  'w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500';

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
      {error ? <span className="block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
