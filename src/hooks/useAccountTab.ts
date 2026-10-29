'use client';

import { useEffect, useState } from 'react';

export type AccountTab = 'profile' | 'security';

// Profile/security tab, linkable as ?tab=security (used by the account menu).
export function useAccountTab(): [AccountTab, (t: AccountTab) => void] {
  const [tab, setTabState] = useState<AccountTab>('profile');

  useEffect(() => {
    const sync = () => setTabState(new URLSearchParams(window.location.search).get('tab') === 'security' ? 'security' : 'profile');
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('mariox-url', sync); // fired by the account menu after navigating
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('mariox-url', sync);
    };
  }, []);

  const setTab = (t: AccountTab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    if (t === 'security') url.searchParams.set('tab', 'security');
    else url.searchParams.delete('tab');
    window.history.replaceState(null, '', url.pathname + url.search);
  };
  return [tab, setTab];
}
