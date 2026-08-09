'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Star,
  Store as StoreIcon,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  ShellContent,
  ShellDrawer,
  ShellFrame,
  ShellMain,
  ShellNav,
  ShellNavGroup,
  ShellSidebar,
  ShellTopbar,
  cn,
} from '@rescuebite/ui/web';
import { useSession } from './SessionContext';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Grouped by administrative job: the queue you work daily, the entities you
 * manage, and the platform-level records. A flat nine-item list gave no sense of
 * which items belong together or which one is the daily driver.
 */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Monitor',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/approvals', label: 'Approvals', icon: BadgeCheck },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/stores', label: 'Stores', icon: StoreIcon },
      { href: '/users', label: 'Users', icon: Users },
      { href: '/listings', label: 'Listings', icon: Package },
      { href: '/orders', label: 'Orders', icon: ClipboardList },
      { href: '/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/audit', label: 'Audit log', icon: FileClock },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  const current = ALL_ITEMS.filter((i) => isActive(i.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  const nav = (
    <nav aria-label="Main">
      {NAV_GROUPS.map((group) => (
        <ShellNavGroup key={group.label} label={group.label}>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition duration-fast ease-standard',
                  active
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500 transition-opacity duration-fast',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    active ? 'text-brand-400' : 'text-neutral-500 group-hover:text-neutral-300',
                  )}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </ShellNavGroup>
      ))}
    </nav>
  );

  return (
    <ShellFrame>
      <ShellSidebar tone="dark">
        <div className="flex h-14 shrink-0 items-center border-b border-neutral-800 px-4">
          <Brand />
        </div>
        <ShellNav>{nav}</ShellNav>
        <AccountBlock email={user.email} name={user.name} onSignOut={signOut} />
      </ShellSidebar>

      <ShellDrawer open={menuOpen} onClose={() => setMenuOpen(false)} tone="dark" label="Main menu">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 px-4">
          <Brand />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-300 transition hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ShellNav>{nav}</ShellNav>
        <AccountBlock email={user.email} name={user.name} onSignOut={signOut} />
      </ShellDrawer>

      <ShellMain>
        <ShellTopbar>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-700 transition hover:bg-surface-raised lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-semibold text-neutral-700">
              {current?.label ?? 'Overview'}
            </span>
          </div>
          {/* Persistent reminder of which console and which identity you're in. */}
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="rounded bg-neutral-900 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-white">
              Admin
            </span>
            <span className="max-w-[220px] truncate">{user.email}</span>
          </span>
        </ShellTopbar>

        <ShellContent>{children}</ShellContent>
      </ShellMain>
    </ShellFrame>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-display text-base font-bold text-white">Mystery Box</span>
      <span className="shrink-0 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Admin
      </span>
    </div>
  );
}

function AccountBlock({
  email,
  name,
  onSignOut,
}: {
  email: string;
  name: string;
  onSignOut: () => Promise<void>;
}) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="shrink-0 border-t border-neutral-800 p-3">
      <div className="flex items-center gap-2.5 px-1 py-1.5">
        <span
          aria-hidden
          className="flex h-[2.25rem] w-[2.25rem] shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-neutral-200"
        >
          {initials || '·'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-100">{name}</p>
          <p className="truncate text-xs text-neutral-400">{email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800/60 hover:text-neutral-100"
      >
        <LogOut className="h-[18px] w-[18px]" aria-hidden />
        Sign out
      </button>
    </div>
  );
}
