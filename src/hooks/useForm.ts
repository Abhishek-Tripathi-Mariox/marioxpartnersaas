'use client';

import { useCallback, useState, type FormEvent } from 'react';

// Small form state helper: values, a field binder and a submit wrapper with busy/error state.
export function useForm<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => setValues(v => ({ ...v, [key]: value })), []);

  // Spread onto <Input>/<Select>/<Textarea>: {...bind('email')}
  const bind = <K extends keyof T>(key: K) => ({
    value: (values[key] ?? '') as string | number,
    onChange: (e: { target: { value: string } }) =>
      set(key, (typeof initial[key] === 'number' ? Number(e.target.value) : e.target.value) as T[K]),
  });

  const submit = (fn: (v: T) => Promise<unknown>) => async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fn(values);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return { values, setValues, set, bind, submit, busy, error, reset: () => setValues(initial) };
}
