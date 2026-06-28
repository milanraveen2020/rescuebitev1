'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FoodCategorySchema, type FoodCategory, type PlatformSettings } from '@rescuebite/types';
import { Button, Card, Input, useToast } from '@rescuebite/ui/web';
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

  useEffect(() => {
    let active = true;
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform-wide configuration.</p>
      </div>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? <p className="text-danger-600">{state.message}</p> : null}

      {state.status === 'ready' ? (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Commission</h2>
            <div className="max-w-xs">
              <Input
                label="Platform commission (%)"
                inputMode="decimal"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                hint="Applied to each sale at checkout."
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Categories</h2>
            <p className="text-sm text-neutral-500">
              Categories enabled for new listings across the platform.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const on = categories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={on}
                    className={`min-h-9 rounded-full border px-3 text-sm font-medium ${
                      on
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-neutral-300 text-neutral-500'
                    }`}
                  >
                    {humanize(cat)}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Feature flags</h2>
            {Object.keys(flags).length === 0 ? (
              <p className="text-sm text-neutral-500">No feature flags yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {Object.entries(flags).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between py-2">
                    <span className="font-mono text-sm text-neutral-800">{key}</span>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-neutral-600">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            setFlags((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        {value ? 'On' : 'Off'}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeFlag(key)}
                        aria-label={`Remove ${key}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                value={newFlag}
                onChange={(e) => setNewFlag(e.target.value)}
                placeholder="new_flag_key"
                aria-label="New feature flag key"
                className="h-10 flex-1 rounded-md border border-neutral-300 px-3 text-sm font-mono outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <Button type="button" variant="secondary" onClick={addFlag}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </Card>

          <Button onClick={() => void onSave()} loading={saving}>
            Save settings
          </Button>
        </div>
      ) : null}
    </div>
  );
}
