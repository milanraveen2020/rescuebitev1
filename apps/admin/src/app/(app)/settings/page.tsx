'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag, Plus, X } from 'lucide-react';
import { FoodCategorySchema, type FoodCategory, type PlatformSettings } from '@rescuebite/types';
import {
  Badge,
  BlockSkeleton,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  PageBody,
  PageHeader,
  Section,
  useToast,
} from '@rescuebite/ui/web';
import { getSettings, updateSettings } from '@/features/settings/api';
import { ApiRequestError } from '@/lib/request';
import { humanize } from '@/lib/format';

type State = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

const CATEGORIES = FoodCategorySchema.options;

export default function SettingsPage() {
  const { toast } = useToast();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [commissionPct, setCommissionPct] = useState('10');
  const [categories, setCategories] = useState<Set<FoodCategory>>(new Set());
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [newFlag, setNewFlag] = useState('');
  const [saving, setSaving] = useState(false);

  function hydrate(settings: PlatformSettings): void {
    setCommissionPct((settings.commissionBps / 100).toString());
    setCategories(new Set(settings.enabledCategories));
    setFlags(settings.featureFlags);
  }

  const load = useCallback(() => {
    let active = true;
    setState({ status: 'loading' });
    getSettings()
      .then((settings) => {
        if (!active) return;
        hydrate(settings);
        setState({ status: 'ready' });
      })
      .catch((e: unknown) =>
        active
          ? setState({
              status: 'error',
              message: e instanceof ApiRequestError ? e.message : 'Could not load settings.',
            })
          : undefined,
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(load, [load]);

  function toggleCategory(cat: FoodCategory): void {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function addFlag(): void {
    const key = newFlag.trim();
    if (!key) return;
    setFlags((prev) => ({ ...prev, [key]: true }));
    setNewFlag('');
  }

  function removeFlag(key: string): void {
    setFlags((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onSave(): Promise<void> {
    const pct = Number.parseFloat(commissionPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast('Commission must be between 0 and 100%.', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSettings({
        commissionBps: Math.round(pct * 100),
        enabledCategories: [...categories],
        featureFlags: flags,
      });
      hydrate(updated);
      toast('Settings saved.', 'success');
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not save settings.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageBody>
      <PageHeader
        title="Settings"
        description="Platform-wide configuration. Changes apply to every store."
        actions={
          state.status === 'ready' ? (
            <Button onClick={() => void onSave()} loading={saving}>
              Save settings
            </Button>
          ) : null
        }
      />

      {state.status === 'loading' ? (
        <>
          <BlockSkeleton lines={2} />
          <BlockSkeleton lines={3} />
        </>
      ) : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'ready' ? (
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <Section
            title="Commission"
            description="The platform's cut of each sale, applied at checkout."
          >
            <div className="max-w-xs">
              <Input
                label="Platform commission"
                inputMode="decimal"
                className="nums"
                trailing={<span className="pr-2 text-sm text-muted-foreground">%</span>}
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                hint="For example 10 means the platform keeps 10% of every order."
              />
            </div>
          </Section>

          <Section
            title="Categories"
            description="Categories merchants can choose for new listings."
          >
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const on = categories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={on}
                    className={`min-h-[2.25rem] rounded-pill border px-3.5 text-sm font-semibold transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      on
                        ? 'border-brand-300 bg-brand-50 text-brand-800'
                        : 'border-line-strong text-muted-foreground hover:bg-surface-raised hover:text-neutral-800'
                    }`}
                  >
                    {humanize(cat)}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 nums text-xs text-muted-foreground">
              {categories.size} of {CATEGORIES.length} enabled
            </p>
          </Section>

          <Section
            title="Feature flags"
            description="Toggle platform behaviour without a deploy."
            className="xl:col-span-2"
            bodyClassName="p-0"
          >
            {Object.keys(flags).length === 0 ? (
              <EmptyState
                icon={<Flag className="h-7 w-7" aria-hidden />}
                title="No feature flags yet"
                description="Add a key below to create your first flag."
                className="py-[2.5rem]"
              />
            ) : (
              <ul className="divide-y divide-line">
                {Object.entries(flags).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-neutral-800">
                      {key}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      {/* Badge makes the on/off state readable at a glance down the list. */}
                      <Badge tone={value ? 'success' : 'neutral'} dot>
                        {value ? 'On' : 'Off'}
                      </Badge>
                      <Checkbox
                        label={`Enable ${key}`}
                        className="[&_span]:sr-only"
                        checked={value}
                        onChange={(e) => setFlags((prev) => ({ ...prev, [key]: e.target.checked }))}
                      />
                      <Button
                        variant="subtle"
                        size="icon-sm"
                        onClick={() => removeFlag(key)}
                        aria-label={`Remove ${key}`}
                        className="hover:bg-danger-50 hover:text-danger-600"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 border-t border-line p-5 sm:flex-row">
              <div className="flex-1">
                <Input
                  label="New feature flag key"
                  hideLabel
                  value={newFlag}
                  onChange={(e) => setNewFlag(e.target.value)}
                  placeholder="new_flag_key"
                  className="font-mono"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addFlag}
                disabled={newFlag.trim() === ''}
              >
                <Plus className="h-4 w-4" aria-hidden /> Add flag
              </Button>
            </div>
          </Section>
        </div>
      ) : null}
    </PageBody>
  );
}
