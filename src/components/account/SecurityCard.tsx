'use client';

import { useState } from 'react';
import { Button, Card, FormError, Input, useToast } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { api } from '@/lib/client';
import { date } from '@/lib/format';
import type { User } from '@/types';
import { ThemeSwitch } from './ThemeSwitch';

const LEVELS = [
  { label: 'Too short', tone: 'var(--bad)' },
  { label: 'Weak', tone: 'var(--bad)' },
  { label: 'Fair', tone: 'var(--warn)' },
  { label: 'Good', tone: 'var(--info)' },
  { label: 'Strong', tone: 'var(--good)' },
  { label: 'Very strong', tone: 'var(--good)' },
];

// Simple strength hint (0–5): length plus character variety.
function strength(p: string) {
  if (p.length < 8) return { score: 0, ...LEVELS[0] };
  const score = [p.length >= 8, p.length >= 12, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  return { score, ...LEVELS[score] };
}

export function PasswordCard() {
  const toast = useToast();
  const [show, setShow] = useState(false);
  const form = useForm({ currentPassword: '', newPassword: '', confirm: '' });
  const v = form.values;
  const st = strength(v.newPassword);

  const onSubmit = form.submit(async values => {
    if (values.newPassword !== values.confirm) throw new Error('New passwords do not match');
    await api.post('/api/me/password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
    form.reset();
    toast('Password changed. Other devices were signed out.');
  });

  return (
    <Card title="Change password" subtitle="You stay signed in here; every other device is signed out.">
      <form className="stack" onSubmit={onSubmit}>
        <Input label="Current password" type={show ? 'text' : 'password'} autoComplete="current-password" required {...form.bind('currentPassword')} />
        <div className="grid-f">
          <div>
            <Input label="New password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} required {...form.bind('newPassword')} />
            {v.newPassword && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <div className="bar" style={{ flex: 1, height: 6 }}><i style={{ width: `${(Math.max(1, st.score) / 5) * 100}%`, background: st.tone }} /></div>
                <span className="sub" style={{ color: st.tone, fontWeight: 600 }}>{st.label}</span>
              </div>
            )}
          </div>
          <Input label="Confirm new password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} required {...form.bind('confirm')} />
        </div>
        <label className="row sub" style={{ gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show passwords
        </label>
        <FormError error={form.error} />
        <div className="form-foot"><Button variant="fire" icon="shield" loading={form.busy}>Update password</Button></div>
      </form>
    </Card>
  );
}

export function SessionsCard({ user }: { user: User }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function signOutOthers() {
    setBusy(true);
    try {
      await api.del('/api/me/sessions');
      toast('Signed out of all other devices');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Sign-in & devices" subtitle={`Last sign-in ${user.lastLoginAt ? date(user.lastLoginAt) : '—'} · account created ${date(user.createdAt)}`}>
      <div className="stack">
        <p className="sub" style={{ fontSize: 14 }}>Lost a phone or used a shared computer? Sign out everywhere except this browser.</p>
        <div><Button icon="refresh" loading={busy} onClick={signOutOthers}>Sign out other devices</Button></div>
      </div>
    </Card>
  );
}

export function AppearanceCard() {
  return (
    <Card title="Appearance" subtitle="Saved in this browser.">
      <div style={{ maxWidth: 360, marginInline: -6 }}><ThemeSwitch /></div>
    </Card>
  );
}
