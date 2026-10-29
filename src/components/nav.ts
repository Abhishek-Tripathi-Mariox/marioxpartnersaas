import type { IconName } from './ui';

// match: extra paths that keep this item highlighted (e.g. the Toolkit sub-pages).
// prefetch: API URLs the page loads first; fetched on hover and when the app is idle so the page opens instantly.
export type NavItem = { href: string; label: string; icon: IconName; match?: string[]; exact?: boolean; prefetch?: string[] };

export const PARTNER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home', prefetch: ['/api/leads', '/api/projects'] },
  { href: '/leads', label: 'Pipeline', icon: 'pipe', prefetch: ['/api/leads'] },
  { href: '/earnings', label: 'Earnings', icon: 'wallet', prefetch: ['/api/projects'] },
  { href: '/projects', label: 'Projects', icon: 'layers', prefetch: ['/api/projects?page=1&limit=10&sort=-closedAt'] },
  { href: '/scope', label: 'Toolkit', icon: 'tool', match: ['/scope', '/visits', '/tech', '/kit'], prefetch: ['/api/requests/scope?page=1&limit=10&sort=-createdAt'] },
  { href: '/support', label: 'Support', icon: 'help', prefetch: ['/api/requests/ticket?page=1&limit=10&sort=-createdAt'] },
];

// Shown in the phone tab bar; the rest live in the account menu.
export const PARTNER_TABS = ['/dashboard', '/leads', '/earnings', '/scope', '/support'];

export const TOOLKIT_TABS = [
  { value: '/scope', label: 'Scope approvals' },
  { value: '/visits', label: 'Office visits' },
  { value: '/tech', label: 'Technical team' },
  { value: '/kit', label: 'Sales kit' },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: 'grid', exact: true, prefetch: ['/api/admin/users', '/api/leads', '/api/projects', '/api/requests/scope', '/api/requests/booking', '/api/requests/tech', '/api/requests/ticket'] },
  { href: '/admin/partners', label: 'Partners', icon: 'users', prefetch: ['/api/admin/users?page=1&limit=25&sort=-createdAt'] },
  { href: '/admin/leads', label: 'Leads', icon: 'pipe', prefetch: ['/api/leads', '/api/admin/users?role=partner'] },
  { href: '/admin/projects', label: 'Projects', icon: 'layers', prefetch: ['/api/projects?page=1&limit=10&sort=-closedAt', '/api/admin/users?role=partner'] },
  { href: '/admin/requests', label: 'Requests', icon: 'fileCheck', prefetch: ['/api/requests/scope?page=1&limit=25&sort=-createdAt'] },
  { href: '/admin/kit', label: 'Sales kit', icon: 'file' },
  { href: '/admin/settings', label: 'Settings', icon: 'tool' },
];

export const ADMIN_TABS = ['/admin', '/admin/partners', '/admin/leads', '/admin/projects', '/admin/requests'];

export function isActive(item: NavItem, path: string, all: NavItem[]) {
  const hits = (p: string) => path === p || path.startsWith(p + '/');
  if (item.exact) return path === item.href;
  if (item.match?.some(hits)) return true;
  // Most specific item wins, so "/admin" is not active on "/admin/partners".
  const best = all.filter(n => !n.exact && hits(n.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return best?.href === item.href;
}
