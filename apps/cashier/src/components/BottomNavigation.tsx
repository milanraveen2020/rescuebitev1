'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, History, LayoutGrid, QrCode, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

const SESSION_TAB: Tab = {
  href: '/session/active',
  label: 'Session',
  icon: LayoutGrid,
  match: (p) => p.startsWith('/session'),
};
const ORDERS_TAB: Tab = {
  href: '/orders',
  label: 'Orders',
  icon: ClipboardList,
  match: (p) => p.startsWith('/orders'),
};
const HISTORY_TAB: Tab = {
  href: '/history',
  label: 'History',
  icon: History,
  match: (p) => p.startsWith('/history'),
};
const PROFILE_TAB: Tab = {
  href: '/profile',
  label: 'Profile',
  icon: User,
  match: (p) => p.startsWith('/profile'),
};

export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 border-t border-black/[0.06] bg-surface-card/95 pb-safe backdrop-blur"
    >
      <div className="relative mx-auto grid max-w-2xl grid-cols-5 items-end px-2">
        <TabLink tab={SESSION_TAB} active={SESSION_TAB.match(pathname)} />
        <TabLink tab={ORDERS_TAB} active={ORDERS_TAB.match(pathname)} />
        <ScanButton active={pathname.startsWith('/scanner')} />
        <TabLink tab={HISTORY_TAB} active={HISTORY_TAB.match(pathname)} />
        <TabLink tab={PROFILE_TAB} active={PROFILE_TAB.match(pathname)} />
      </div>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'tap flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition',
        active ? 'text-brand-700' : 'text-neutral-400 hover:text-neutral-600',
      )}
    >
      <Icon className="h-6 w-6" aria-hidden />
      {tab.label}
    </Link>
  );
}

function ScanButton({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center">
      <Link
        href="/scanner"
        aria-current={active ? 'page' : undefined}
        aria-label="Scan QR code"
        className={cn(
          'tap -mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-card-lg ring-4 ring-surface-card transition active:scale-95',
          active && 'ring-brand-200',
        )}
      >
        <QrCode className="h-7 w-7" aria-hidden />
      </Link>
    </div>
  );
}
