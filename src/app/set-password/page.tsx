'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { Button, FormError, Input } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { api } from '@/lib/client';

// Landing page for the setPasswordUrl returned by POST /api/v1/users.
function SetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const form = useForm({ password: '', confirm: '' });

  const onSubmit = form.submit(async v => {
    if (v.password !== v.confirm) throw new Error('Passwords do not match');
    await api.post('/api/auth/set-password', { token, password: v.password });
    window.location.href = '/dashboard';
  });

  if (!token) return <div className="form-error">This link is missing its token. Ask Mariox to resend your invite.</div>;

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={onSubmit}>
      <Input label="New password" type="password" minLength={8} required autoComplete="new-password" hint="At least 8 characters" {...form.bind('password')} />
      <Input label="Confirm password" type="password" minLength={8} required autoComplete="new-password" {...form.bind('confirm')} />
      <FormError error={form.error} />
      <Button variant="fire" block loading={form.busy}>Save and continue</Button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <AuthLayout eyebrow="Partner invite" title="Set your password" subtitle="One step and your partner portal is ready.">
      <Suspense>
        <SetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
