'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Trash2, UserPlus, Users } from 'lucide-react';
import { InviteStaffSchema, type StaffMember } from '@rescuebite/types';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageBody,
  PageHeader,
  Section,
  TableSkeleton,
  useToast,
} from '@rescuebite/ui/web';
import { inviteStaff, listStaff, removeStaff } from '@/features/staff/api';
import { ApiRequestError } from '@/lib/request';

type State =
  | { status: 'loading' }
  | { status: 'ready'; staff: StaffMember[] }
  | { status: 'error'; message: string };

export default function StaffPage() {
  const { toast } = useToast();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(() => {
    listStaff()
      .then((staff) => setState({ status: 'ready', staff }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ApiRequestError ? e.message : 'Could not load staff.',
        }),
      );
  }, []);

  useEffect(load, [load]);

  async function onInvite(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});
    const parsed = InviteStaffSchema.safeParse({ name, email });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setInviting(true);
    try {
      const result = await inviteStaff(parsed.data);
      setInvited({ email: result.staff.email, password: result.tempPassword });
      setCopied(false);
      setName('');
      setEmail('');
      toast('Staff member invited.', 'success');
      load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not invite staff.', 'error');
    } finally {
      setInviting(false);
    }
  }

  async function onRemove(member: StaffMember): Promise<void> {
    setRemovingId(member.id);
    try {
      await removeStaff(member.id);
      toast('Staff member removed.', 'neutral');
      setRemoveTarget(null);
      load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not remove staff.', 'error');
    } finally {
      setRemovingId(null);
    }
  }

  async function copyPassword(): Promise<void> {
    if (!invited) return;
    try {
      await navigator.clipboard.writeText(invited.password);
      setCopied(true);
      toast('Temporary password copied.', 'success');
    } catch {
      // Clipboard can be blocked by permissions — the password is on screen anyway.
      toast('Could not copy. Select the password and copy it manually.', 'error');
    }
  }

  const count = state.status === 'ready' ? state.staff.length : 0;

  return (
    <PageBody>
      <PageHeader
        title="Staff"
        description="Staff can verify pickups and manage orders. They cannot change store settings, listings, or payouts."
      />

      {/*
        A freshly issued temporary password is the one thing on this page that is
        both time-critical and unrecoverable, so it gets a warning treatment and a
        copy button rather than a quiet tinted note.
      */}
      {invited ? (
        <Alert
          tone="warning"
          title={`Temporary password for ${invited.email}`}
          action={
            <Button variant="outline" size="sm" onClick={() => void copyPassword()}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy
                </>
              )}
            </Button>
          }
        >
          <p className="nums mt-1 select-all font-mono text-lg font-bold tracking-wider text-neutral-900">
            {invited.password}
          </p>
          <p className="mt-1 text-xs">
            Share it once — it is not stored and will not be shown again. They must choose their own
            password the first time they sign in.
          </p>
        </Alert>
      ) : null}

      <Section
        title="Invite a team member"
        description="They get a temporary password to sign in at the counter."
      >
        <form onSubmit={(e) => void onInvite(e)} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2 xl:max-w-3xl">
            <Input
              label="Full name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              errorText={errors.name}
              placeholder="Nimal Perera"
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errorText={errors.email}
              placeholder="nimal@store.com"
              hint="They sign in with this address."
              autoComplete="email"
            />
          </div>
          <Button type="submit" loading={inviting}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Send invite
          </Button>
        </form>
      </Section>

      {state.status === 'error' ? <ErrorState message={state.message} onRetry={load} /> : null}

      {state.status === 'loading' ? (
        <Section title="Team" bodyClassName="p-0">
          <TableSkeleton rows={3} columns={2} />
        </Section>
      ) : null}

      {state.status === 'ready' ? (
        <Section
          title="Team"
          description={count > 0 ? `${count} staff member${count === 1 ? '' : 's'}` : undefined}
          bodyClassName="p-0"
        >
          {count === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7" aria-hidden />}
              title="No staff yet"
              description="Invite your first team member above so they can verify pickups at the counter."
              className="py-[2.5rem]"
            />
          ) : (
            <ul className="divide-y divide-line">
              {state.staff.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4 p-4 transition hover:bg-surface-raised/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-[2.25rem] w-[2.25rem] shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800"
                    >
                      {member.name
                        .split(' ')
                        .map((p) => p[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || '·'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-900">{member.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="subtle"
                    size="icon"
                    disabled={removingId === member.id}
                    aria-label={`Remove ${member.name}`}
                    title={`Remove ${member.name}`}
                    onClick={() => setRemoveTarget(member)}
                    className="hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove staff member?"
        tone="danger"
        confirmLabel="Remove"
        loading={removingId === removeTarget?.id}
        description={
          removeTarget ? (
            <>
              <strong className="text-neutral-800">{removeTarget.name}</strong> will lose access to
              this store immediately. Their account is kept, so you can re-invite them later.
            </>
          ) : null
        }
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) void onRemove(removeTarget);
        }}
      />
    </PageBody>
  );
}
