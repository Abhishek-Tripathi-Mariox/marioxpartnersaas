'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { Button, FormError, Input } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { api } from '@/lib/client';
import type { User } from '@/types';

function LoginForm() {
  const next = useSearchParams().get('next');
  const form = useForm({ email: '', password: '' });

  const onSubmit = form.submit(async v => {
    const { user } = await api.post<{ user: User }>('/api/auth/login', v);
    // Full navigation so middleware sees the new cookie.
    window.location.href = next || (user.role === 'admin' ? '/admin' : '/dashboard');
  });

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={onSubmit}>
      <Input label="Email" type="email" autoComplete="email" required placeholder="you@company.in" {...form.bind('email')} />
      <Input label="Password" type="password" autoComplete="current-password" required {...form.bind('password')} />
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
