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
import { cn } from '@rescuebite/ui/web';
import { useSession } from './SessionContext';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/approvals', label: 'Approvals', icon: BadgeCheck },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/stores', label: 'Stores', icon: StoreIcon },
  { href: '/listings', label: 'Listings', icon: Package },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/audit', label: 'Audit log', icon: FileClock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition',
              active ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-800/60',
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
      {/* Desktop sidebar — dark, to distinguish the operator console */}
      <aside className="hidden w-56 shrink-0 flex-col bg-neutral-900 p-4 md:flex">
        <Brand />
        <div className="mt-6 flex-1">{nav}</div>
        <SignOut email={user.email} onSignOut={signOut} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-neutral-900 px-4 py-3 md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-200 hover:bg-neutral-800"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {menuOpen ? (
        <div className="bg-neutral-900 p-4 md:hidden">
          {nav}
          <div className="mt-4 border-t border-neutral-800 pt-4">
            <SignOut email={user.email} onSignOut={signOut} />
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-lg font-bold text-white">RescueBite</span>
      <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Admin
      </span>
    </div>
  );
}

function SignOut({ email, onSignOut }: { email: string; onSignOut: () => Promise<void> }) {
  return (
    <div className="space-y-2">
      <p className="truncate px-3 text-xs text-neutral-400">{email}</p>
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800/60"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Sign out
      </button>
    </div>
  );
}
