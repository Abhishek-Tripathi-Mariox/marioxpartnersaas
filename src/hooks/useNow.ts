'use client';

import { useEffect, useState } from 'react';

// Current time that refreshes every `ms`, for clocks and countdowns. Pauses while the tab is hidden.
export function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, ms);
    const wake = () => !document.hidden && setNow(Date.now());
    document.addEventListener('visibilitychange', wake);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', wake); };
  }, [ms]);
  return now;
}
