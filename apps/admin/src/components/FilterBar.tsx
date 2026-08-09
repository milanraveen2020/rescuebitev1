'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button, SearchInput, Select, Toolbar } from '@rescuebite/ui/web';

interface SelectFilter {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /**
   * Text for the "no filter" option. English pluralisation is too irregular to
   * derive ("Status" → "Statuses", "Visibility" → "Visibilities"), so callers
   * name it.
   */
  allLabel?: string;
}

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  selects?: SelectFilter[];
  /** Result count or other context, right-aligned. */
  trailing?: ReactNode;
}

/**
 * Search box (debounced) plus dropdown filters for a table. Now built on the
 * shared `Toolbar`/`SearchInput`/`Select` primitives so control heights, focus
 * rings, and spacing match the merchant app instead of being restyled inline.
 */
export function FilterBar({ search, selects, trailing }: FilterBarProps) {
  const [term, setTerm] = useState(search?.value ?? '');

  // Debounce the search so we don't refetch on every keystroke.
  useEffect(() => {
    if (!search) return undefined;
    const id = setTimeout(() => {
      if (term !== search.value) search.onChange(term);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const active =
    (search ? term.trim() !== '' : false) || (selects ?? []).some((s) => s.value !== '');

  function clearAll(): void {
    setTerm('');
    search?.onChange('');
    for (const sel of selects ?? []) sel.onChange('');
  }

  return (
    <Toolbar
      trailing={
        <>
          {/* Only offer a reset once there is something to reset. */}
          {active ? (
            <Button variant="subtle" size="sm" onClick={clearAll}>
              Clear filters
            </Button>
          ) : null}
          {trailing}
        </>
      }
    >
      {search ? (
        <div className="min-w-[16rem] flex-1 sm:max-w-sm">
          <SearchInput
            label={search.placeholder ?? 'Search'}
            placeholder={search.placeholder ?? 'Search'}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onClear={() => setTerm('')}
          />
        </div>
      ) : null}

      {(selects ?? []).map((sel) => (
        <div key={sel.label} className="sm:w-48">
          <Select
            label={sel.label}
            hideLabel
            value={sel.value}
            onChange={(e) => sel.onChange(e.target.value)}
          >
            <option value="">{sel.allLabel ?? `All ${sel.label.toLowerCase()}`}</option>
            {sel.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      ))}
    </Toolbar>
  );
}
