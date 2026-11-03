'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import Link from 'next/link';
import { Button, FormError, Input, PasswordInput } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { api } from '@/lib/client';
import type { User } from '@/types';

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next');
  const form = useForm({ email: params.get('email') ?? '', password: '' });

  const onSubmit = form.submit(async v => {
    const { user } = await api.post<{ user: User }>('/api/auth/login', v);
    // Full navigation so middleware sees the new cookie.
    window.location.href = next || (user.role === 'admin' ? '/admin' : '/dashboard');
  });

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={onSubmit}>
      {params.get('reset') && <div className="note good"><span>Password changed. Sign in with your new password.</span></div>}
      <Input label="Email" type="email" autoComplete="email" required placeholder="you@company.in" {...form.bind('email')} />
      <div className="stack" style={{ gap: 8 }}>
        <PasswordInput label="Password" autoComplete="current-password" required autoFocus={!!params.get('email')} {...form.bind('password')} />
        <Link className="fp-link" style={{ alignSelf: 'flex-end' }} href={`/forgot-password${form.values.email ? `?email=${encodeURIComponent(form.values.email)}` : ''}`}>Forgot password?</Link>
      </div>
      <FormError error={form.error} />
      <Button variant="fire" block loading={form.busy}>Sign in</Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout eyebrow="Partner portal" title="Welcome back" subtitle="Sign in to see your pipeline, projects and commissions.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
