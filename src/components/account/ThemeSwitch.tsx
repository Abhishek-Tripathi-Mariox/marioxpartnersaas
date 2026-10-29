'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/ui';
import { getTheme, setTheme, type Theme } from '@/lib/theme';

const OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'Auto', icon: 'monitor' },
];

// Three-way theme toggle; used in the account menu and on the account pages.
export function ThemeSwitch() {
  const [theme, set] = useState<Theme>('system');
  useEffect(() => {
    set(getTheme());
    const sync = () => set(getTheme());
    window.addEventListener('mariox-theme', sync);
    return () => window.removeEventListener('mariox-theme', sync);
  }, []);

  return (
    <div className="theme-seg" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={theme === o.value} className={theme === o.value ? 'on' : ''} onClick={() => setTheme(o.value)}>
          <Icon name={o.icon} size="s" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
