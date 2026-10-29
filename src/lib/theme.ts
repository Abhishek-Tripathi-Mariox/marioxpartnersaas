// Light / dark / system theme, stored per browser. theme.css reads :root[data-theme].
export type Theme = 'light' | 'dark' | 'system';
export const THEME_KEY = 'mariox.theme';

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(t: Theme) {
  try {
    if (t === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {}
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  window.dispatchEvent(new Event('mariox-theme'));
}

// Inlined in <head> so the saved theme applies before first paint (no flash).
export const THEME_BOOT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
