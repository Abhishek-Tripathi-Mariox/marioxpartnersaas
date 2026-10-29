'use client';

import { useEffect, useState } from 'react';
import { useSettings } from './SettingsProvider';
import { Icon } from './ui';

const KEY = 'mariox.announcement.dismissed';

// Banner for the admin's announcement (Settings → Contacts & announcement).
// Dismissing hides only this exact text; a new announcement shows again.
export function Announcement() {
  const { settings, reload } = useSettings();
  const text = settings.announcement?.trim();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    reload(); // settings are loaded once per session; refresh so a new announcement appears right away
    try {
      setDismissed(localStorage.getItem(KEY));
    } catch {}
  }, [reload]);

  if (!text || dismissed === text) return null;

  function dismiss() {
    setDismissed(text!);
    try {
      localStorage.setItem(KEY, text!);
    } catch {}
  }

  return (
    <div className="announce" role="status">
      <span className="ico"><Icon name="bell" size="s" /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lbl">Announcement from Mariox</div>
        <p>{text}</p>
      </div>
      <button className="x" onClick={dismiss} aria-label="Dismiss announcement">
        <Icon name="x" size="s" />
      </button>
    </div>
  );
}
