'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { Button, FormError, Icon, Input, PasswordInput } from '@/components/ui';
import { api } from '@/lib/client';

type Step = 'email' | 'code' | 'password';

const TITLES: Record<Step, [string, string]> = {
  email: ['Forgot password?', 'Enter your account email. We will send you a 6-digit code.'],
  code: ['Check your email', 'Enter the 6-digit code we sent you.'],
  password: ['Set a new password', 'Choose a password you have not used here before.'],
};

// Forgot password: email (must belong to an account) → 6-digit code by email → new password → sign in.
function ForgotFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(useSearchParams().get('email') ?? '');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const sendCode = () => run(async () => {
    const r = await api.post<{ resendIn: number }>('/api/auth/forgot', { email });
    setCode('');
    setResendIn(r.resendIn);
    setStep('code');
  });
  const verify = (otp = code) => run(async () => {
    // A wrong code empties the boxes so the next one can be typed straight away.
    const r = await api.post<{ token: string }>('/api/auth/forgot/verify', { email, otp }).catch(e => { setCode(''); throw e; });
    setToken(r.token);
    setStep('password');
  });
  const reset = () => run(async () => {
    if (password !== confirm) throw new Error('Passwords do not match');
    await api.post('/api/auth/forgot/reset', { email, token, password });
    router.replace(`/login?reset=1&email=${encodeURIComponent(email)}`);
  });

  const [title, sub] = TITLES[step];
  return (
    <>
      <div className="fp-head">
        <div className="eyebrow">Step {step === 'email' ? 1 : step === 'code' ? 2 : 3} of 3</div>
        <h2 className="h-lg">{title}</h2>
        <p className="lede">{step === 'code' ? <>We sent a 6-digit code to <b>{email}</b>.</> : sub}</p>
      </div>

      {step === 'email' && (
        <form className="stack" style={{ gap: 16 }} onSubmit={e => { e.preventDefault(); sendCode(); }}>
          <Input label="Email" type="email" autoComplete="email" required autoFocus placeholder="you@company.in" value={email} onChange={e => setEmail(e.target.value)} />
          <FormError error={error} />
          <Button variant="fire" block loading={busy} icon="mail">Send code</Button>
        </form>
      )}

      {step === 'code' && (
        <form className="stack" style={{ gap: 16 }} onSubmit={e => { e.preventDefault(); verify(); }}>
          <div className="field">
            <span>6-digit code</span>
            <OtpInput value={code} onChange={setCode} onComplete={v => verify(v)} disabled={busy} />
            <small>The code expires in 10 minutes.</small>
          </div>
          <FormError error={error} />
          <Button variant="fire" block loading={busy} disabled={code.length !== 6}>Verify code</Button>
          <div className="between" style={{ fontSize: 13.5 }}>
            <button type="button" className="more" onClick={() => { setStep('email'); setError(null); }}><Icon name="chevL" size="s" />Change email</button>
            {resendIn > 0 ? (
              <span className="sub">Resend code in {resendIn}s</span>
            ) : (
              <button type="button" className="more" disabled={busy} onClick={sendCode}>Resend code</button>
            )}
          </div>
        </form>
      )}

      {step === 'password' && (
        <form className="stack" style={{ gap: 16 }} onSubmit={e => { e.preventDefault(); reset(); }}>
          <PasswordInput label="New password" autoComplete="new-password" minLength={8} required autoFocus hint="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
          <PasswordInput label="Confirm password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} />
          <FormError error={error} />
          <Button variant="fire" block loading={busy} icon="check">Change password</Button>
        </form>
      )}

      <p className="sub" style={{ textAlign: 'center', fontSize: 13.5 }}>
        Remembered it? <Link className="fp-link" href="/login">Back to sign in</Link>
      </p>
    </>
  );
}

// Six boxes; typing moves forward, Backspace moves back, pasting a code fills them all.
function OtpInput({ value, onChange, onComplete, disabled }: { value: string; onChange: (v: string) => void; onComplete: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // First box gets focus on open and again after a wrong code clears them.
  useEffect(() => { if (!value && !disabled) refs.current[0]?.focus(); }, [value, disabled]);
  const put = (v: string) => {
    const next = v.replace(/\D/g, '').slice(0, 6);
    onChange(next);
    refs.current[Math.min(next.length, 5)]?.focus();
    if (next.length === 6) onComplete(next);
  };
  return (
    <div className="otp" onPaste={e => { e.preventDefault(); put(e.clipboardData.getData('text')); }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          className="inp"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          aria-label={`Digit ${i + 1}`}
          disabled={disabled}
          value={value[i] ?? ''}
          onChange={e => {
            const d = e.target.value.replace(/\D/g, '');
            // Typing (or autofill of several digits) fills from this box on; clearing a box drops what follows.
            put(value.slice(0, i) + d);
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !value[i] && i > 0) { e.preventDefault(); onChange(value.slice(0, i - 1)); refs.current[i - 1]?.focus(); }
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout eyebrow="" title="" subtitle="" bare>
      <Suspense>
        <ForgotFlow />
      </Suspense>
    </AuthLayout>
  );
}
