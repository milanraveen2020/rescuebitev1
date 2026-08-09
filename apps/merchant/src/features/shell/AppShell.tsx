'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  QrCode,
  Store as StoreIcon,
  Users,
  Wallet,
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
import { Logo } from './Logo';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

/**
 * Nav is grouped by job rather than presented as one flat list: what you do every
 * shift (Today, Orders), what you set up (Listings, Store, Staff), and what you
 * review (Analytics, Payouts). Staff accounts only ever see the first group.
 */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operate',
    items: [
      { href: '/', label: 'Today', icon: LayoutDashboard },
      { href: '/orders', label: 'Orders', icon: ClipboardList },
    ],
  },
  {
    label: 'Set up',
    items: [
      { href: '/listings', label: 'Listings', icon: Package, ownerOnly: true },
      { href: '/store', label: 'Store', icon: StoreIcon, ownerOnly: true },
      { href: '/staff', label: 'Staff', icon: Users, ownerOnly: true },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3, ownerOnly: true },
      { href: '/payouts', label: 'Payouts', icon: Wallet, ownerOnly: true },
    ],
  },
];

/** Flat lookup so the topbar can name the current section. */
const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function AppShell({ children }: { children: ReactNode }) {
  const { store, user, isOwner, signOut } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  // Longest match wins so /listings/new resolves to Listings, not Today.
  const current = ALL_ITEMS.filter((i) => isActive(i.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isOwner || !item.ownerOnly),
  })).filter((group) => group.items.length > 0);

  const nav = (
    <nav aria-label="Main">
      {groups.map((group) => (
        // A single group needs no header — staff would just see "Operate" alone.
        <ShellNavGroup key={group.label} label={groups.length > 1 ? group.label : undefined}>
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
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-neutral-600 hover:bg-surface-raised hover:text-neutral-900',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity duration-fast',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    active
                      ? 'text-brand-700'
                      : 'text-subtle-foreground group-hover:text-neutral-700',
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
      <ShellSidebar>
        <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
          <Logo subtitle={store.name} lockupClassName="h-7" />
        </div>
        <ShellNav>{nav}</ShellNav>
        <AccountBlock name={user.name} email={user.email} isOwner={isOwner} onSignOut={signOut} />
      </ShellSidebar>

      <ShellDrawer open={menuOpen} onClose={() => setMenuOpen(false)} label="Main menu">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <Logo subtitle={store.name} lockupClassName="h-7" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 transition hover:bg-surface-raised"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ShellNav>{nav}</ShellNav>
        <AccountBlock name={user.name} email={user.email} isOwner={isOwner} onSignOut={signOut} />
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

          {/* Brand on mobile (the sidebar is hidden); section name on desktop. */}
          <div className="min-w-0 flex-1">
            <span className="lg:hidden">
              <Logo subtitle={store.name} lockupClassName="h-6" />
            </span>
            <span className="hidden truncate text-sm font-semibold text-neutral-700 lg:block">
              {current?.label ?? 'Today'}
            </span>
          </div>

          {/*
            One global shortcut only. Verifying a pickup is the job that can
            interrupt a merchant on any screen, so it stays reachable everywhere;
            creating things is contextual and lives in each page's own header,
            which avoids two competing primary buttons on one screen.
          */}
          <Link
            href="/orders"
            className="inline-flex h-[2.25rem] shrink-0 items-center gap-2 rounded-md border border-line-strong bg-surface-card px-3 text-sm font-semibold text-neutral-700 transition hover:bg-surface-raised"
          >
            <QrCode className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Verify pickup</span>
            <span className="sr-only sm:hidden">Verify pickup</span>
          </Link>
        </ShellTopbar>

        <ShellContent>{children}</ShellContent>
      </ShellMain>
    </ShellFrame>
  );
}

function AccountBlock({
  name,
  email,
  isOwner,
  onSignOut,
}: {
  name: string;
  email: string;
  isOwner: boolean;
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
    <div className="shrink-0 border-t border-line p-3">
      <div className="flex items-center gap-2.5 rounded-md px-1 py-1.5">
        <span
          aria-hidden
          className="flex h-[2.25rem] w-[2.25rem] shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
        >
          {initials || '·'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-800">{name}</p>
          {/* Role is load-bearing here: it explains why some nav items are absent. */}
          <p className="truncate text-xs text-muted-foreground">
            {isOwner ? 'Owner' : 'Staff'} · {email}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-600 transition hover:bg-surface-raised hover:text-neutral-900"
      >
        <LogOut className="h-[18px] w-[18px] text-subtle-foreground" aria-hidden />
        Sign out
      </button>
    </div>
  );
}
