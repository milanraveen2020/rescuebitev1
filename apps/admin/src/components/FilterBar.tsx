'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface SelectFilter {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  selects?: SelectFilter[];
}

/** Search box (submitted on a short debounce) + dropdown filters for a table. */
export function FilterBar({ search, selects }: FilterBarProps) {
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

  return (
    <div className="flex flex-wrap items-end gap-3">
      {search ? (
        <div className="relative min-w-[14rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={search.placeholder ?? 'Search'}
            aria-label={search.placeholder ?? 'Search'}
            className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      ) : null}

      {(selects ?? []).map((sel) => (
        <label key={sel.label} className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
          {sel.label}
          <select
            value={sel.value}
            onChange={(e) => sel.onChange(e.target.value)}
            className="h-10 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-800"
          >
            <option value="">All</option>
            {sel.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
