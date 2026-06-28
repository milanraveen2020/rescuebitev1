'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { InviteStaffSchema, type StaffMember } from '@rescuebite/types';
import { Button, Card, Input, useToast } from '@rescuebite/ui/web';
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
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(
    null,
  );
  const [removingId, setRemovingId] = useState<string | null>(null);

  function load(): void {
    listStaff()
      .then((staff) => setState({ status: 'ready', staff }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          message: e instanceof ApiRequestError ? e.message : 'Could not load staff.',
        }),
      );
  }

  useEffect(load, []);

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
      setTempPassword({ email: result.staff.email, password: result.tempPassword });
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
    if (!window.confirm(`Remove ${member.name} from your store?`)) return;
    setRemovingId(member.id);
    try {
      await removeStaff(member.id);
      toast('Staff member removed.', 'neutral');
      load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not remove staff.', 'error');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl">Staff</h1>
        <p className="text-sm text-muted-foreground">
          Invite staff to verify pickups. They can manage orders but not store settings, listings,
          or payouts.
        </p>
      </header>

      <Card>
        <form onSubmit={(e) => void onInvite(e)} className="space-y-4" noValidate>
          <h2 className="font-display text-lg font-semibold text-neutral-900">
            Invite a team member
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              errorText={errors.name}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errorText={errors.email}
            />
          </div>
          <Button type="submit" loading={inviting}>
            Send invite
          </Button>
        </form>

        {tempPassword ? (
          <div className="mt-4 rounded-md bg-brand-50 p-4 text-sm">
            <p className="font-medium text-brand-800">
              Share these credentials with {tempPassword.email}:
            </p>
            <p className="mt-1 text-neutral-700">
              Temporary password:{' '}
              <span className="font-mono font-semibold">{tempPassword.password}</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              This won&apos;t be shown again. They can change it after signing in.
            </p>
          </div>
        ) : null}
      </Card>

      {state.status === 'loading' ? <p className="text-muted-foreground">Loading…</p> : null}
      {state.status === 'error' ? <p className="text-danger-600">{state.message}</p> : null}

      {state.status === 'ready' ? (
        state.staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No staff yet. Invite your first team member above.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {state.staff.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">{member.name}</p>
                  <p className="truncate text-sm text-neutral-500">{member.email}</p>
                </div>
                <button
                  onClick={() => void onRemove(member)}
                  disabled={removingId === member.id}
                  aria-label={`Remove ${member.name}`}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-neutral-500 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-60"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
