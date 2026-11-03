'use client';

import { useCallback, useState, type FormEvent } from 'react';
import type { Rule } from '@/lib/validate';

export type Rules<T> = Partial<Record<keyof T, Rule>>;

// Small form state helper: values, a field binder and a submit wrapper with busy/error state.
// With `rules`, every field is checked before submit and errors show under the fields (bind passes `error`).
export function useForm<T extends object>(initial: T, rules: Rules<T> = {}) {
  const [values, setValues] = useState<T>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e)); // editing a field clears its error
  }, []);

  // Spread onto <Input>/<Select>/<Textarea>/<PhoneInput>: {...bind('email')}
  const bind = <K extends keyof T>(key: K) => ({
    value: (values[key] ?? '') as string | number,
    error: errors[key] ?? null,
    onChange: (e: { target: { value: string } }) =>
      set(key, (typeof initial[key] === 'number' ? Number(e.target.value) : e.target.value) as T[K]),
  });

  // Runs every rule; true when the form is fine.
  const validate = (v: T = values) => {
    const next: Partial<Record<keyof T, string>> = {};
    for (const k of Object.keys(rules) as (keyof T)[]) {
      const msg = rules[k]?.(String(v[k] ?? '').trim());
      if (msg) next[k] = msg;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (fn: (v: T) => Promise<unknown>) => async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!validate()) { setError('Please fix the highlighted fields'); return; }
    setBusy(true);
    try {
      await fn(values);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return { values, setValues, set, bind, submit, validate, errors, setErrors, busy, error, reset: () => { setValues(initial); setErrors({}); } };
}
