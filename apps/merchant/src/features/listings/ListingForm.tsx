'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2 } from 'lucide-react';
import {
  CreateListingSchema,
  FoodCategorySchema,
  UpdateListingSchema,
  type Listing,
} from '@rescuebite/types';
import {
  Alert,
  Button,
  Checkbox,
  FormActions,
  Input,
  PageBody,
  PageHeader,
  PriceTag,
  Section,
  Select,
  Textarea,
} from '@rescuebite/ui/web';
import {
  ListingApiError,
  createListing,
  getEnabledCategories,
  updateListing,
  uploadListingImage,
} from './api';

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
  /** Live stock, editable only when editing an existing listing. */
  quantityRemaining: string;
  pickupStart: string; // datetime-local
  pickupEnd: string;
  imageUrl: string;
  allergenInfo: string;
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
    quantityRemaining: initial ? String(initial.quantityRemaining) : '',
    pickupStart: initial ? toLocalInput(initial.pickupStart) : '',
    pickupEnd: initial ? toLocalInput(initial.pickupEnd) : '',
    imageUrl: initial?.imageUrl ?? '',
    allergenInfo: initial?.allergenInfo ?? '',
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
  /**
   * Categories the operator currently allows. Starts as the full enum so the
   * select is never empty, then narrows once the platform config arrives. The
   * listing's own category is always kept so editing an existing bag in a
   * since-disabled category still shows its real value.
   */
  const [categories, setCategories] = useState<readonly string[]>(CATEGORIES);

  useEffect(() => {
    let active = true;
    getEnabledCategories()
      .then((enabled) => {
        if (!active || enabled.length === 0) return;
        const withCurrent =
          initial && !enabled.includes(initial.category) ? [...enabled, initial.category] : enabled;
        setCategories(withCurrent);
      })
      // A config read failure must not block publishing; the server still validates.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initial]);

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
      allergenInfo: form.allergenInfo.trim() === '' ? undefined : form.allergenInfo,
      status: form.publish ? ('ACTIVE' as const) : ('DRAFT' as const),
      // Create derives remaining from the total; only an edit can adjust live stock.
      ...(mode === 'edit' && form.quantityRemaining !== ''
        ? { quantityRemaining: Number.parseInt(form.quantityRemaining, 10) }
        : {}),
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
    <PageBody>
      <PageHeader
        title={mode === 'create' ? 'New surprise bag' : 'Edit surprise bag'}
        description="Describe the bag, set the price and the pickup window, then publish when you're ready."
        eyebrow={
          <button
            type="button"
            onClick={() => router.push('/listings')}
            className="rounded text-sm font-medium text-brand-700 hover:underline"
          >
            ← Back to listings
          </button>
        }
      />

      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        {formError ? (
          <Alert tone="error" className="mb-6">
            {formError}
          </Alert>
        ) : null}

        {/*
          Two columns on desktop: what the bag *is* on the left, and the
          commercial terms (price, stock, window) on the right — the two things
          merchants tweak most, no longer buried at the bottom of a long scroll.
        */}
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <Section title="What's in the bag" description="This is what customers see first.">
            <div className="space-y-4">
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                errorText={errors.title}
                placeholder="Bakery Surprise Bag"
              />
              <Textarea
                label="Description"
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                errorText={errors.description}
                placeholder="A mix of whatever's left at close — usually sourdough, pastries and rolls."
                hint="Hint at the contents without promising specific items."
              />
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                errorText={errors.category}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>

              {/*
                Allergens were already stored and already rendered on the customer
                bag screen, but there was no field anywhere to enter them — so the
                section simply never appeared in the app.
              */}
              <Textarea
                label="Allergen information"
                rows={3}
                value={form.allergenInfo}
                onChange={(e) => set('allergenInfo', e.target.value)}
                errorText={errors.allergenInfo}
                placeholder="Contains wheat, milk, eggs. May contain traces of nuts."
                hint="Shown to customers in its own “Allergens” section. Leave blank if genuinely not applicable."
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-800">Photo</p>
                <div className="flex items-center gap-4">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt="Listing preview"
                      className="h-20 w-28 shrink-0 rounded-md border border-line object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-line-strong bg-surface-raised text-subtle-foreground">
                      <ImagePlus className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                  <div>
                    <label className="inline-flex min-h-[2.25rem] cursor-pointer items-center rounded-md border border-line-strong bg-surface-card px-3 text-sm font-semibold text-neutral-700 transition hover:bg-surface-raised focus-within:ring-2 focus-within:ring-brand-500">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => void onImageChange(e.target.files?.[0])}
                        className="sr-only"
                      />
                      {form.imageUrl ? 'Replace photo' : 'Upload photo'}
                    </label>
                    {uploading ? (
                      <p
                        role="status"
                        className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Uploading…
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Optional, but bags with photos sell noticeably faster.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <div className="space-y-6">
            <Section title="Price & stock">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Original value"
                    required
                    inputMode="decimal"
                    className="nums"
                    leading="€"
                    value={form.originalPrice}
                    onChange={(e) => set('originalPrice', e.target.value)}
                    errorText={errors.originalPrice}
                    placeholder="15.00"
                    hint="What it would normally cost."
                  />
                  <Input
                    label="Customer pays"
                    required
                    inputMode="decimal"
                    className="nums"
                    leading="€"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    errorText={errors.price}
                    placeholder="5.00"
                    hint="Usually a third of the original."
                  />
                </div>

                {preview ? (
                  preview.invalid ? (
                    <Alert tone="error">
                      The discounted price cannot exceed the original value.
                    </Alert>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-brand-200 bg-brand-50 p-3">
                      <PriceTag originalMinor={preview.original} priceMinor={preview.price} />
                      <span className="nums shrink-0 text-sm font-semibold text-brand-800">
                        {preview.percent}% off
                      </span>
                    </div>
                  )
                ) : null}

                <Input
                  label="Bags available"
                  required
                  type="number"
                  min={1}
                  className="nums"
                  value={form.quantityTotal}
                  onChange={(e) => set('quantityTotal', e.target.value)}
                  errorText={errors.quantityTotal}
                  hint="How many of this bag you can put together in total."
                />

                {/*
                  `quantityRemaining` was already accepted by UpdateListingSchema but
                  had no field, so a merchant who made extra bags mid-session — or
                  who broke one — had no way to correct live stock.
                */}
                {mode === 'edit' && initial ? (
                  <Input
                    label="Still available now"
                    type="number"
                    min={0}
                    max={Number(form.quantityTotal) || undefined}
                    className="nums"
                    value={form.quantityRemaining}
                    onChange={(e) => set('quantityRemaining', e.target.value)}
                    errorText={errors.quantityRemaining}
                    hint={`${initial.quantityTotal - initial.quantityRemaining} sold so far. Adjust if you made extra bags or lost some — customers see this count immediately.`}
                  />
                ) : null}
              </div>
            </Section>

            <Section
              title="Pickup window"
              description="When customers can collect. Bags expire at the end of the window."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Starts"
                  required
                  type="datetime-local"
                  value={form.pickupStart}
                  onChange={(e) => set('pickupStart', e.target.value)}
                  errorText={errors.pickupStart}
                />
                <Input
                  label="Ends"
                  required
                  type="datetime-local"
                  value={form.pickupEnd}
                  onChange={(e) => set('pickupEnd', e.target.value)}
                  errorText={errors.pickupEnd}
                />
              </div>
            </Section>

            <Section title="Visibility">
              <Checkbox
                boxed
                checked={form.publish}
                onChange={(e) => set('publish', e.target.checked)}
                label="Publish now"
                hint="Live listings are the only ones customers and the counter can see. Leave this off to save a draft."
              />

              <FormActions>
                <Button type="submit" loading={submitting} disabled={uploading}>
                  {mode === 'create' ? 'Create listing' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/listings')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </FormActions>
            </Section>
          </div>
        </div>
      </form>
    </PageBody>
  );
}
