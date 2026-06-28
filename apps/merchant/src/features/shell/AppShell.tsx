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
  Store as StoreIcon,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@rescuebite/ui/web';
import { useSession } from './SessionContext';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/listings', label: 'Listings', icon: Package, ownerOnly: true },
  { href: '/store', label: 'Store', icon: StoreIcon, ownerOnly: true },
  { href: '/payouts', label: 'Payouts', icon: Wallet, ownerOnly: true },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, ownerOnly: true },
  { href: '/staff', label: 'Staff', icon: Users, ownerOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { store, user, isOwner, signOut } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((item) => isOwner || !item.ownerOnly);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium transition',
              active ? 'bg-brand-50 text-brand-800' : 'text-neutral-600 hover:bg-neutral-100',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 md:flex">
        <Brand store={store.name} />
        <div className="mt-6 flex-1">{nav}</div>
        <SignOut name={user.name} onSignOut={signOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <Brand store={store.name} />
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen ? (
        <div className="border-b border-neutral-200 bg-white p-4 md:hidden">
          {nav}
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <SignOut name={user.name} onSignOut={signOut} />
          </div>
        </div>
      ) : null}

      <main className="flex-1">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function Brand({ store }: { store: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-lg font-bold leading-tight text-brand-700">
        RescueBite
      </span>
      <span className="truncate text-xs text-neutral-500">{store}</span>
    </div>
  );
}

function SignOut({ name, onSignOut }: { name: string; onSignOut: () => Promise<void> }) {
  return (
    <div className="space-y-2">
      <p className="truncate px-3 text-xs text-neutral-500">{name}</p>
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Sign out
      </button>
    </div>
  );
}
