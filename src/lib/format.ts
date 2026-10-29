const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const inr = (n?: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

// ₹12.5L / ₹1.2 Cr style used across the portal.
export function short(n?: number) {
  const v = n || 0;
  if (v >= 1e7) return '₹' + +(v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '₹' + +(v / 1e5).toFixed(2) + 'L';
  return inr(v);
}

export function date(s?: string | Date) {
  if (!s) return '—';
  const iso = typeof s === 'string' ? s : s.toISOString();
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!d) return String(s);
  return `${+d} ${MONTHS[+m - 1]}${y !== String(new Date().getFullYear()) ? ' ' + y : ''}`;
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const todayISO = () => new Date().toISOString().slice(0, 10);
