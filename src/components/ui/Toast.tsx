'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type Toast = { id: number; text: string; error?: boolean };
const Ctx = createContext<(text: string, error?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, error?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text, error }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.error ? 'err' : ''}`}>
            <span className="ico"><Icon name={t.error ? 'alert' : 'check'} size="s" /></span>
            <div><b>{t.text}</b></div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
