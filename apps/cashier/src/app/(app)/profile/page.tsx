'use client';

import { useRouter } from 'next/navigation';
import { Building2, Download, LogOut, Mail, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useOnline } from '@/lib/useOnline';
import { useInstallPrompt } from '@/lib/useInstallPrompt';

export default function ProfilePage() {
  const router = useRouter();
  const { staff, store, signOut } = useAuth();
  const online = useOnline();
  const { canInstall, promptInstall } = useInstallPrompt();

  const initials = (staff?.name ?? '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <AppHeader title="Profile" subtitle="Account & app" />

      <div className="space-y-4 p-4 pb-8">
        <Card className="flex items-center gap-4 p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient font-display text-xl font-extrabold text-white">
            {initials || '·'}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold text-neutral-900">{staff?.name}</p>
            <p className="inline-flex items-center gap-1 rounded-pill bg-brand-100 px-2 py-0.5 text-xs font-semibold capitalize text-brand-800">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              {staff?.role}
            </p>
          </div>
        </Card>

        <Card className="divide-y divide-neutral-100 p-1">
          <Row icon={Mail} label="Email" value={staff?.email ?? '—'} />
          <Row icon={Building2} label="Merchant" value={store?.name ?? '—'} />
          <Row
            icon={online ? Wifi : WifiOff}
            label="Connection"
            value={online ? 'Online' : 'Offline'}
            valueClass={online ? 'text-success-700' : 'text-warning-700'}
          />
        </Card>

        {canInstall ? (
          <Button
            block
            variant="secondary"
            size="lg"
            onClick={() => void promptInstall()}
            leftIcon={<Download className="h-5 w-5" aria-hidden />}
          >
            Install the app
          </Button>
        ) : null}

        <Button
          block
          variant="outline"
          size="lg"
          className="text-danger-600"
          onClick={() => {
            void signOut().then(() => router.replace('/login'));
          }}
          leftIcon={<LogOut className="h-5 w-5" aria-hidden />}
        >
          Log out
        </Button>

        <p className="pt-2 text-center text-xs text-neutral-400">Mystery Box Cashier · v1.0.0</p>
      </div>
    </>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-neutral-500">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1 text-sm text-neutral-500">{label}</span>
      <span className={`text-sm font-semibold text-neutral-900 ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}
